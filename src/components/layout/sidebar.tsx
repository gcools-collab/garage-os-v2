import Link from "next/link"
import {
  LayoutDashboard,
  Car,
  Globe,
  ShoppingCart,
  Megaphone,
  BarChart3,
  Bell,
  Settings
} from "lucide-react"


const navigation = [

  {
    name:"Dashboard",
    href:"/dashboard",
    icon:LayoutDashboard
  },

  {
    name:"Stock",
    href:"/stock",
    icon:Car
  },

  {
    name:"Market Intelligence",
    href:"/market",
    icon:Globe
  },

  {
    name:"Buying Assistant",
    href:"/buying",
    icon:ShoppingCart
  },

  {
    name:"Diffusion",
    href:"/diffusion",
    icon:Megaphone
  },

  {
    name:"Analytics",
    href:"/analytics",
    icon:BarChart3
  },

  {
    name:"Alertes",
    href:"/alerts",
    icon:Bell
  },

  {
    name:"Paramètres",
    href:"/settings",
    icon:Settings
  }

]


export function Sidebar(){

return (

<aside className="
hidden
md:flex
w-72
min-h-screen
flex-col
bg-zinc-950
text-white
p-6
">


<div className="mb-10">

<h1 className="text-2xl font-bold">
🚗 Garage OS
</h1>

<p className="text-sm text-zinc-400 mt-1">
Automotive Intelligence
</p>

</div>



<nav className="space-y-2">

{
navigation.map((item)=>{

const Icon=item.icon

return (

<Link

key={item.href}

href={item.href}

className="
flex
items-center
gap-3
rounded-lg
px-3
py-2
text-sm
text-zinc-300
hover:bg-zinc-800
hover:text-white
transition
"

>

<Icon size={18}/>

{item.name}

</Link>

)

})

}


</nav>


</aside>

)

}