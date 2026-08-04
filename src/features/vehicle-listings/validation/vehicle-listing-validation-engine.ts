import type { VehicleListingContent, VehicleListingFacts, VehicleListingValidation, VehicleListingValidationItem } from "../types"
const item=(id:string,state:VehicleListingValidationItem["state"],message:string):VehicleListingValidationItem=>({id,state,message})
const allText=(content:VehicleListingContent)=>[content.premium,content.leboncoin,content.laCentrale,content.facebook,content.instagram,content.googleBusiness,content.short,content.long,content.seo.title,content.seo.description,content.seo.metaDescription,...content.salesArguments,...content.negotiationArguments,...content.copilotSummary].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
export class VehicleListingValidationEngine{
 validate(facts:VehicleListingFacts,content:VehicleListingContent):VehicleListingValidation{
  const text=allText(content)
  const values=(pattern:RegExp)=>[...text.matchAll(pattern)].map(match=>Number(match[1].replace(/[\s.]/g,"").replace(",","."))).filter(Number.isFinite)
  const differs=(found:readonly number[],expected:number|null)=>expected!==null&&found.some(value=>Math.abs(value-expected)>1)
  const unknownEquipment=facts.commercial.equipment.length===0?false:content.salesArguments.some(argument=>/equip|option/i.test(argument)&&!facts.commercial.equipment.some(equipment=>argument.toLowerCase().includes(equipment.toLowerCase())))
  const rules=[
   differs(values(/\b(\d{1,3}(?:[ .]\d{3})+|\d+)\s*km\b/g),facts.specifications.mileageKm)?item("mileage","BLOCKER","Le kilométrage généré diverge des faits."):item("mileage","PASS","Kilométrage cohérent."),
   differs(values(/\b(\d{1,3}(?:[ .]\d{3})+|\d+)\s*(?:€|euros?)/g),facts.commercial.sellingPriceEuros)?item("price","BLOCKER","Le prix généré diverge des faits."):item("price","PASS","Prix cohérent."),
   differs(values(/\b(\d{1,3}(?:[ .]\d{3})+|\d+)\s*(?:ch|chevaux)\b/g),facts.specifications.powerDin)?item("power","BLOCKER","La puissance générée diverge des faits."):item("power","PASS","Puissance cohérente."),
   !facts.commercial.warranty&&/garanti(?:e|es)?\s+(?:\d|constructeur|integrale)/i.test(text)?item("warranty","BLOCKER","Une garantie absente des faits a été ajoutée."):item("warranty","PASS","Aucune garantie inventée."),
   unknownEquipment?item("equipment","BLOCKER","Un équipement non vérifié est mis en avant."):item("equipment","PASS","Équipements cohérents."),
   /(sans aucun risque|resultat garanti|meilleur prix garanti)/i.test(text)?item("legal","BLOCKER","Une promesse juridique ou absolue a été détectée."):item("legal","PASS","Aucune promesse absolue."),
   content.leboncoin.includes("#")?item("leboncoin-format","WARNING","Le texte Leboncoin contient un formatage inattendu."):item("leboncoin-format","PASS","Format Leboncoin lisible.")
  ] as const
  const blockers=rules.filter(rule=>rule.state==="BLOCKER"),warnings=rules.filter(rule=>rule.state==="WARNING")
  return{state:blockers.length?"BLOCKER":warnings.length?"WARNING":"PASS",items:rules,blockers,warnings}
 }
}
