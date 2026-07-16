import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"


export default function DashboardLayout({

children

}:{

children:React.ReactNode

}){


return (

<div className="
flex
min-h-screen
bg-zinc-50
">


<Sidebar/>


<div className="
flex-1
">


<Header/>


<main className="p-8">

{children}

</main>


</div>


</div>

)

}