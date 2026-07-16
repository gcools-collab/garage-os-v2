export function Header() {
    return (
      <header className="
        h-16
        border-b
        flex
        items-center
        justify-between
        px-6
      ">
  
        <div>
          <h2 className="font-semibold">
            Bonjour 👋
          </h2>
  
          <p className="text-sm text-muted-foreground">
            Voici votre résumé du jour
          </p>
        </div>
  
  
        <div className="
          rounded-full
          bg-muted
          px-4
          py-2
          text-sm
        ">
          Garage Demo
        </div>
  
  
      </header>
    )
  }