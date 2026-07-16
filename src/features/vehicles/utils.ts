export function calculateTotalCosts(costs:any[]){

    return costs?.reduce(
    
    (total,cost)=>{
    
    return total + Number(cost.amount)
    
    },
    
    0
    
    ) ?? 0
    
    }
    
    
    
    export function calculateVehicleMargin(vehicle:any){
    
    
    const costs = calculateTotalCosts(
    vehicle.vehicle_costs
    )
    
    
    
    const investment =
    
    Number(vehicle.purchase_price ?? 0)
    
    +
    
    costs
    
    
    
    const margin =
    
    Number(vehicle.market_price ?? 0)
    
    -
    
    investment
    
    
    
    return {
    
    costs,
    
    investment,
    
    margin
    
    }
    
    
    }