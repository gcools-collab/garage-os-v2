import type{VehicleListingProvider}from"../types"
export class FakeVehicleListingProvider implements VehicleListingProvider{readonly id="fake";readonly model="fake";constructor(private readonly response:unknown,private readonly error?:Error){}async generate(){if(this.error)throw this.error;return this.response}}
