export function Header({ garageName }: { readonly garageName: string }){

    return (
    
    <header className="
    h-16
    border-b
    bg-white
    flex
    items-center
    justify-between
    px-8
    ">
    
    <div>
    
    <h2 className="font-semibold">
    Tableau de bord
    </h2>
    
    </div>
    
    
    <div className="
    text-sm
    text-muted-foreground
    ">
    
    {garageName}
    
    </div>
    
    
    </header>
    
    )
    
    }
