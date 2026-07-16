import { register } from "./actions"


export function RegisterForm(){

return (

<form
action={register}
className="space-y-4 max-w-md"
>


<input
name="fullName"
placeholder="Nom complet"
className="border rounded-lg p-3 w-full"
/>


<input
name="garageName"
placeholder="Nom du garage"
className="border rounded-lg p-3 w-full"
/>


<input
name="email"
type="email"
placeholder="Email"
className="border rounded-lg p-3 w-full"
/>


<input
name="password"
type="password"
placeholder="Mot de passe"
className="border rounded-lg p-3 w-full"
/>



<button
className="
bg-black
text-white
rounded-lg
px-5
py-3
"
>

Créer mon garage

</button>


</form>

)

}