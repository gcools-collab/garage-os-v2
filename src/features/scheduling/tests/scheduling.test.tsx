import assert from"node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";import{renderToStaticMarkup}from"react-dom/server";import{AppointmentAvailabilityEngine,AppointmentBookingEngine,AppointmentStatusEngine}from"../engine/scheduling-engine";import{AppointmentCalendarBuilder,PublicBookingBuilder}from"../builders/scheduling-builders";import{PublicSlotSelector}from"../components/PublicSlotSelector";import type{AppointmentRecord,AppointmentTypeSetting}from"../types/scheduling"
const setting=(overrides:Partial<AppointmentTypeSetting>={}):AppointmentTypeSetting=>({type:"TEST_DRIVE",onlineBookingEnabled:true,durationMinutes:30,minimumNoticeMinutes:0,bookingHorizonDays:30,bufferBeforeMinutes:0,bufferAfterMinutes:0,autoConfirm:false,paymentRequired:false,simultaneousCapacity:1,...overrides})
const engine=new AppointmentAvailabilityEngine();const base={from:new Date("2026-08-17T00:00:00Z"),to:new Date("2026-08-17T23:59:00Z"),timezone:"Europe/Paris",hours:[{dayOfWeek:1,opensAt:"09:00",closesAt:"11:00"}],exceptions:[],appointments:[],setting:setting(),now:new Date("2026-08-16T00:00:00Z")}
test("calcule les horaires, durées, délai et horizon sans mutation",()=>{const slots=engine.build(base);assert.deepEqual(slots,["2026-08-17T09:00:00.000Z","2026-08-17T09:30:00.000Z","2026-08-17T10:00:00.000Z","2026-08-17T10:30:00.000Z"]);assert.equal(base.hours.length,1);assert.equal(engine.build({...base,setting:setting({minimumNoticeMinutes:3000})}).length,0)})
test("garage fermé et réservation désactivée ne produisent aucun créneau",()=>{assert.deepEqual(engine.build({...base,hours:[]}),[]);assert.deepEqual(engine.build({...base,setting:setting({onlineBookingEnabled:false})}),[])})
test("exceptions, buffers et capacité filtrent les collisions",()=>{const blocked=engine.build({...base,exceptions:[{kind:"CLOSED"as const,startsAt:"2026-08-17T09:30:00Z",endsAt:"2026-08-17T10:00:00Z"}],appointments:[{startsAt:"2026-08-17T10:00:00Z",endsAt:"2026-08-17T10:30:00Z"}],setting:setting({bufferBeforeMinutes:15})});assert.deepEqual(blocked,["2026-08-17T09:00:00.000Z"]);assert.ok(engine.build({...base,appointments:[{startsAt:"2026-08-17T09:00:00Z",endsAt:"2026-08-17T09:30:00Z"}],setting:setting({simultaneousCapacity:2})}).includes("2026-08-17T09:00:00.000Z"))})
test("détermine PENDING CONFIRMED et AWAITING_PAYMENT",()=>{const booking=new AppointmentBookingEngine();assert.equal(booking.initialStatus(setting()),"PENDING");assert.equal(booking.initialStatus(setting({autoConfirm:true})),"CONFIRMED");assert.equal(booking.initialStatus(setting({paymentRequired:true,autoConfirm:true})),"AWAITING_PAYMENT")})
test("refuse les transitions arbitraires",()=>{const status=new AppointmentStatusEngine();assert.equal(status.canTransition("PENDING","CONFIRMED"),true);assert.equal(status.canTransition("PENDING","COMPLETED"),false);assert.equal(status.canTransition("CONFIRMED","NO_SHOW"),true)})
test("builders agenda dashboard public préparent la présentation",()=>{const row={id:"a",garage_id:"g",lead_id:"l",vehicle_id:"v",type:"TEST_DRIVE",status:"PENDING",starts_at:"2026-08-17T09:00:00Z",ends_at:"2026-08-17T09:30:00Z",timezone:"Europe/Paris",customer_name:"Jean Martin",customer_phone:"0600000000",customer_email:null,is_historical:false,payment_required:false,details:{},created_at:"2026-08-16T00:00:00Z"}as const satisfies AppointmentRecord;assert.equal(new AppointmentCalendarBuilder().build([row])[0].href,"/appointments/a");const slots=new PublicBookingBuilder().build([{starts_at:row.starts_at,ends_at:row.ends_at,local_date:"2026-08-17",local_time:"11:00:00"}]);assert.match(renderToStaticMarkup(<PublicSlotSelector slots={slots}/>),/Votre rendez-vous/)})

test("un rendez-vous historique anonyme utilise uniquement un fallback de présentation", () => {
  const row = {
    id: "legacy", garage_id: "g", lead_id: null, vehicle_id: null, type: "OTHER", status: "COMPLETED",
    starts_at: "2022-01-01T09:00:00Z", ends_at: "2022-01-01T09:30:00Z", timezone: "Europe/Paris",
    customer_name: null, customer_phone: null, customer_email: null, is_historical: true,
    payment_required: false, details: { legacy_booking_id: "3795" }, created_at: "2022-01-01T09:00:00Z",
  } as const satisfies AppointmentRecord
  assert.equal(new AppointmentCalendarBuilder().build([row])[0].customerName, "Contact non disponible")
})

test("la migration staff autorise création RDV et dossier sans rendez-vous", () => {
  const migration = readFileSync("supabase/migrations/20260827000052_staff_appointment_registration.sql", "utf8")
  assert.match(migration, /create_staff_appointment/)
  assert.match(migration, /create_staff_registration_case/)
  assert.match(migration, /customer_id/)
  assert.match(migration, /pg_advisory_xact_lock/)
  assert.match(migration, /is_historical = false/)
})

test("GO-0090.6B migration rend la planification offer-aware et exclut l'historique", () => {
  const migration = readFileSync("supabase/migrations/20260828000058_offer_aware_scheduling.sql", "utf8")
  assert.match(migration, /live_slug = 'sap'/)
  assert.match(migration, /engine-cleaning-2l-plus/)
  assert.match(migration, /duration_minutes = 90/)
  assert.match(migration, /Traitement choc double machine/)
  assert.match(migration, /p_duration_minutes integer default null/i)
  assert.match(migration, /p_offer_slug text default null/i)
  assert.match(migration, /duration_minutes', booking_duration/)
  assert.match(migration, /options_duration_delta_minutes/)
  assert.match(migration, /is_historical = false/)
  assert.match(migration, /distinct_option_count/)
  assert.doesNotMatch(migration, /drop table/i)
  assert.doesNotMatch(migration, /363f2dc0-bfd3-48d6-a1cc-96e113e96094/)
})

test("la disponibilité publique accepte offerSlug côté repository", () => {
  const source = readFileSync("src/features/scheduling/repositories/scheduling-repository.ts", "utf8")
  assert.match(source, /p_offer_slug: offerSlug/)
})

test("les rendez-vous historiques ne proposent pas de lien opérationnel", () => {
  const row = {
    id: "legacy", garage_id: "g", lead_id: null, vehicle_id: null, customer_id: "cust-1",
    type: "OTHER", status: "COMPLETED", starts_at: "2022-01-01T09:00:00Z", ends_at: "2022-01-01T09:30:00Z",
    timezone: "Europe/Paris", customer_name: null, customer_phone: null, customer_email: null,
    is_historical: true, payment_required: false, details: {}, created_at: "2022-01-01T09:00:00Z",
  } as const satisfies AppointmentRecord
  const built = new AppointmentCalendarBuilder().build([row])[0]
  assert.equal(built.href, null)
  assert.equal(built.isHistorical, true)
})

test("les actions staff bloquent les transitions sur l'historique importé", () => {
  const source = readFileSync("src/features/scheduling/actions/scheduling-actions.ts", "utf8")
  assert.match(source, /current\.is_historical/)
})
test("la migration garantit atomicité concurrence RLS et confidentialité",()=>{const sql=readFileSync("supabase/migrations/20260814000043_create_scheduling_platform.sql","utf8");for(const token of["pg_advisory_xact_lock","simultaneous_capacity","enable row level security","security definer","revoke all","garage_members","submission_fingerprint","APPOINTMENT_BOOKED","PAYMENT_REQUIRED","RESCHEDULED"])assert.match(sql,new RegExp(token,"i"));assert.doesNotMatch(sql,/insert into public\.garage_business_hours/)})
test("services inactifs, véhicule non publié et agenda absent sont refusés",()=>{const sql=readFileSync("supabase/migrations/20260814000043_create_scheduling_platform.sql","utf8");assert.match(sql,/garage_services[\s\S]*is_enabled/);assert.match(sql,/publication_status='PUBLISHED'/);assert.match(sql,/schedule_unavailable|booking_disabled/)})
test("routes, navigation, notifications et dashboard sont intégrés",()=>{assert.match(readFileSync("src/components/layout/dashboard-navigation.ts","utf8"),/Agenda/);assert.match(readFileSync("src/app/(dashboard)/dashboard/page.tsx","utf8"),/buildAppointmentDashboardSummary/);assert.match(readFileSync("src/app/(dashboard)/dashboard/page.tsx","utf8"),/DailyCockpit/);const sql=readFileSync("supabase/migrations/20260814000043_create_scheduling_platform.sql","utf8");assert.match(sql,/Rendez-vous à confirmer|Nouveau rendez-vous/);assert.match(readFileSync("src/app/(dashboard)/appointments/[appointmentId]/page.tsx","utf8"),/Déplacer le rendez-vous/)})
