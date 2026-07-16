"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"


export async function createVehicle(
  formData: FormData
){

const supabase = await createClient()


const {
data:{
user
}

}= await supabase.auth.getUser()


if(!user){

throw new Error("Non authentifié")

}



const brand = formData.get("brand") as string
const model = formData.get("model") as string
const year = Number(formData.get("year"))
const mileage = Number(formData.get("mileage"))
const purchasePrice = Number(formData.get("purchasePrice"))



const {data:member,error:memberError}=await supabase

.from("garage_members")

.select("garage_id")

.eq(
"user_id",
user.id
)

.single()



if(memberError || !member){

throw new Error(
"Garage introuvable"
)

}



const {error}=await supabase

.from("vehicles")

.insert({

garage_id:member.garage_id,

brand,

model,

year,

mileage,

purchase_price:purchasePrice,

status:"PURCHASED"

})



if(error){

throw new Error(
error.message
)

}



revalidatePath("/stock")

}