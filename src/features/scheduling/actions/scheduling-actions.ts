"use server"
import{revalidatePath}from"next/cache";import{redirect}from"next/navigation";import{getActiveGarageSession}from"@/features/tenant";import{AppointmentStatusEngine}from"../engine/scheduling-engine";import{getAppointment,saveSchedulingSettings}from"../repositories/scheduling-repository";import{appointmentStatusSchema,schedulingSettingsSchema}from"../validation/scheduling-validation"
export async function createStaffAppointment(formData: FormData) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const customerId = String(formData.get("customerId") ?? "")
  const type = String(formData.get("type") ?? "")
  const startsAt = String(formData.get("startsAt") ?? "")
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000)

  if (!/^[0-9a-f-]{36}$/i.test(customerId) || Number.isNaN(Date.parse(startsAt))) return

  const db = await (await import("@/lib/supabase/server")).createClient()
  const { data, error } = await db.rpc("create_staff_appointment", {
    p_garage_id: session.garageId,
    p_customer_id: customerId,
    p_type: type,
    p_starts_at: new Date(startsAt).toISOString(),
    p_details: notes ? { notes } : {},
  })

  if (error) return

  const row = Array.isArray(data) ? data[0] as { appointment_id?: string; outcome?: string } : null
  if (row?.outcome !== "success" || !row.appointment_id) return

  revalidatePath("/appointments")
  revalidatePath(`/customers/${customerId}`)
  revalidatePath("/dashboard")
  redirect(`/appointments/${row.appointment_id}`)
}

export async function updateAppointmentStatus(formData:FormData){const session=await getActiveGarageSession();if(!session?.garageId)return;const parsed=appointmentStatusSchema.safeParse({appointmentId:formData.get("appointmentId"),status:formData.get("status")});if(!parsed.success)return;const current=await getAppointment(session.garageId,parsed.data.appointmentId);if(!current||current.is_historical||!new AppointmentStatusEngine().canTransition(current.status,parsed.data.status))return;const{createClient}=await import("@/lib/supabase/server");const db=await createClient();const{error}=await db.from("appointments").update({status:parsed.data.status,updated_at:new Date().toISOString()}).eq("garage_id",session.garageId).eq("id",current.id);if(error)return;const eventType=parsed.data.status==="NO_SHOW"?"NO_SHOW":parsed.data.status==="COMPLETED"?"COMPLETED":parsed.data.status==="CANCELLED"?"CANCELLED":"CONFIRMED";await db.from("appointment_events").insert({garage_id:session.garageId,appointment_id:current.id,actor_id:session.userId,event_type:eventType,old_status:current.status,new_status:parsed.data.status});if(parsed.data.status==="CANCELLED")await db.from("notifications").insert({garage_id:session.garageId,type:"SYSTEM",title:"Rendez-vous annulé",message:current.customer_name??"Contact non disponible",href:`/appointments/${current.id}`,entity_type:"appointment",entity_id:current.id});revalidatePath("/appointments");revalidatePath(`/appointments/${current.id}`);revalidatePath("/dashboard")}
export async function updateSchedulingConfiguration(input:unknown){const session=await getActiveGarageSession();if(!session?.garageId||!['owner','admin'].includes(session.memberRole??''))return{success:false,message:"Accès refusé."};const parsed=schedulingSettingsSchema.safeParse(input);if(!parsed.success)return{success:false,message:"Configuration invalide."};const success=await saveSchedulingSettings(session.garageId,parsed.data);if(success){revalidatePath("/settings/appointments");revalidatePath(`/g/${session.garageSlug}/contact`)}return{success,message:success?"Agenda enregistré.":"Enregistrement impossible."}}
export async function rescheduleAppointment(formData:FormData){const session=await getActiveGarageSession();if(!session?.garageId)return;const id=String(formData.get('appointmentId')??'');const startsAt=String(formData.get('startsAt')??'');if(!/^[0-9a-f-]{36}$/i.test(id)||Number.isNaN(Date.parse(startsAt)))return;const current=await getAppointment(session.garageId,id);if(!current||current.is_historical)return;const db=await(await import('@/lib/supabase/server')).createClient();const{data,error}=await db.rpc('reschedule_appointment',{p_appointment_id:id,p_starts_at:new Date(startsAt).toISOString()});if(error||!data)return;revalidatePath('/appointments');revalidatePath(`/appointments/${id}`);revalidatePath('/dashboard')}
export async function addCalendarException(formData:FormData){const session=await getActiveGarageSession();if(!session?.garageId||!['owner','admin'].includes(session.memberRole??''))return;const kind=String(formData.get('kind'));const startsAt=String(formData.get('startsAt'));const endsAt=String(formData.get('endsAt'));if(!['CLOSED','UNAVAILABLE','OPEN'].includes(kind)||Number.isNaN(Date.parse(startsAt))||Number.isNaN(Date.parse(endsAt))||Date.parse(startsAt)>=Date.parse(endsAt))return;const db=await(await import('@/lib/supabase/server')).createClient();await db.from('garage_calendar_exceptions').insert({garage_id:session.garageId,kind,starts_at:new Date(startsAt).toISOString(),ends_at:new Date(endsAt).toISOString(),created_by:session.userId});revalidatePath('/settings/appointments')}
