import { createClient } from "@/lib/supabase/server"
import { VehicleForm } from "@/features/vehicles/vehicle-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"


export default async function StockPage(){


const supabase = await createClient()


const {
data:{
user
}

}=await supabase.auth.getUser()



const {
data:member
}=await supabase

.from("garage_members")

.select("garage_id")

.eq(
"user_id",
user?.id
)

.single()



const {
data:vehicles
}=await supabase

.from("vehicles")

.select("*")

.eq(
"garage_id",
member?.garage_id
)

.order(
"created_at",
{
ascending:false
}

)



return (

<div className="space-y-8">


<div className="flex justify-between">

<div>

<h1 className="text-3xl font-bold">

Stock véhicules

</h1>


<p className="text-muted-foreground">

Gestion de votre parc automobile

</p>

</div>

<Button asChild>
<Link href="/stock/import">Importer une annonce</Link>
</Button>

</div>



<div className="rounded-xl border bg-white p-6">

<h2 className="font-semibold mb-4">

Ajouter un véhicule

</h2>


<VehicleForm/>


</div>



<div>

<h2 className="text-xl font-semibold mb-4">

Véhicules en stock ({vehicles?.length ?? 0})

</h2>



<div className="grid gap-4">

{
vehicles?.map((vehicle)=>(

<Link
key={vehicle.id}
href={`/stock/${vehicle.id}`}
className="
rounded-xl
border
bg-white
p-5
"
>

<h3 className="font-bold">

{vehicle.brand}
{" "}
{vehicle.model}

</h3>


<p>

{vehicle.year}
{" "}
-
{" "}
{vehicle.mileage} km

</p>


<p className="mt-2">

Achat :
{" "}
{vehicle.purchase_price} €

</p>


</Link>

))

}

</div>


</div>


</div>

)

}
