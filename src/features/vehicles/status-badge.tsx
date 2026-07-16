import { Badge } from "@/components/ui/badge"


const labels:any={

PURCHASED:"Achat",

PREPARATION:"Préparation",

PUBLISHED:"Publié",

PRICE_DROP:"Baisse prix",

MODIFIED:"Modification",

SOLD:"Vendu"

}



export function StatusBadge({

status

}:{

status:string

}){


return (

<Badge>

{labels[status] ?? status}

</Badge>

)

}