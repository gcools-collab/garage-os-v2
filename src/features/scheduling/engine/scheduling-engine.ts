import type { AppointmentStatus, AppointmentTypeSetting, BusinessHoursPeriod, CalendarException } from "../types/scheduling"

const transitions: Readonly<Record<AppointmentStatus,readonly AppointmentStatus[]>>={PENDING:["CONFIRMED","CANCELLED"],AWAITING_PAYMENT:["CONFIRMED","CANCELLED"],CONFIRMED:["COMPLETED","CANCELLED","NO_SHOW"],COMPLETED:[],CANCELLED:[],NO_SHOW:[]}
export class AppointmentStatusEngine { canTransition(from:AppointmentStatus,to:AppointmentStatus){return transitions[from].includes(to)} }
export class AppointmentDurationEngine { getDuration(setting:AppointmentTypeSetting){return setting.durationMinutes} }
export class AppointmentAvailabilityEngine {
  build(input:{readonly from:Date;readonly to:Date;readonly timezone:string;readonly hours:readonly BusinessHoursPeriod[];readonly exceptions:readonly CalendarException[];readonly setting:AppointmentTypeSetting;readonly appointments:readonly {readonly startsAt:string;readonly endsAt:string}[];readonly now:Date}){
    if(!input.setting.onlineBookingEnabled||!input.hours.length)return []
    const slots:string[]=[]; const cursor=new Date(input.from)
    while(cursor<=input.to){const day=cursor.getUTCDay();for(const period of input.hours.filter(item=>item.dayOfWeek===day)){const [oh,om]=period.opensAt.split(":").map(Number);const [ch,cm]=period.closesAt.split(":").map(Number);let start=Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),cursor.getUTCDate(),oh,om);const close=Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),cursor.getUTCDate(),ch,cm);while(start+input.setting.durationMinutes*60000<=close){const end=start+input.setting.durationMinutes*60000;const notice=input.now.getTime()+input.setting.minimumNoticeMinutes*60000;const horizon=input.now.getTime()+input.setting.bookingHorizonDays*86400000;const blocked=input.exceptions.some(item=>item.kind!=="OPEN"&&Date.parse(item.startsAt)<end&&Date.parse(item.endsAt)>start);const concurrent=input.appointments.filter(item=>Date.parse(item.startsAt)<end+input.setting.bufferAfterMinutes*60000&&Date.parse(item.endsAt)>start-input.setting.bufferBeforeMinutes*60000).length;if(start>=notice&&start<=horizon&&!blocked&&concurrent<input.setting.simultaneousCapacity)slots.push(new Date(start).toISOString());start+=input.setting.durationMinutes*60000} } cursor.setUTCDate(cursor.getUTCDate()+1)} return slots
  }
}
export class AppointmentBookingEngine { initialStatus(setting:AppointmentTypeSetting):AppointmentStatus{return setting.paymentRequired?"AWAITING_PAYMENT":setting.autoConfirm?"CONFIRMED":"PENDING"} }
