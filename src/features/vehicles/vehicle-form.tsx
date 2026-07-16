import { createVehicle } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"


export function VehicleForm(){

return (

<form
action={createVehicle}
className="space-y-4"
>


<Input
name="brand"
placeholder="Marque"
/>


<Input
name="model"
placeholder="Modèle"
/>


<Input
name="year"
placeholder="Année"
/>


<Input
name="mileage"
placeholder="Kilométrage"
/>


<Input
name="purchasePrice"
placeholder="Prix achat"
/>


<Button>

Ajouter véhicule

</Button>


</form>

)

}