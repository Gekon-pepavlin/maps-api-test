import L, { LatLngExpression } from "leaflet";
import MarkerLayer from "./MarkerLayer";
import { LocationPoint } from "./LocationPoint";
import { MapOptions } from "./MapObject";

export type GeometryType = "polygon" | "line";

export default class Geometry{

    map: MapOptions | undefined;
    layer: MarkerLayer | undefined;
    isActive: boolean = false;

    private htmlElement: HTMLElement| undefined;

    private leafletObject: L.Polygon | L.Polyline;
    private type: GeometryType;
    
    constructor( points: LocationPoint[][], type: GeometryType){
        this.type = type;
        this.leafletObject = type == "polygon" ? L.polygon(points) : L.polyline(points);
    }

    attachMap(map: MapOptions){
        this.map = map;
        this.setActive(true);
    }

    addToLayer(layer: MarkerLayer){

        // layer._addGeometry(this);
        this.layer = layer;
    }

    setActive(isActive: boolean){
        if(isActive === this.isActive) return;
        this.isActive = isActive;

        // if(this.layer) this.layer._onChangeListener();
        
        if(!this.map) return;

        if( this.isActive ){
            this.leafletObject.addTo( this.map );
            // @ts-ignore
            this.htmlElement = this.leafletObject._path;
            this.htmlElement?.setAttribute("pointer-events", "auto");
            
        }
        else this.leafletObject.removeFrom( this.map )

    }

    addEvent(name: "click" | "dblclick" | "mousedown" | "mouseup" | "mouseover" | "mouseout" | "mousemove" | "contextmenu" | "preclick", 
        func: (geometry: Geometry, map: MapOptions)=>any){
        this.leafletObject.on(name, ()=>{
            if(!this.map) return;
            func(this, this.map);
        });

        return this;
    }

    getHtmlElement(){
        return this.htmlElement as HTMLElement;
    }

    getLeafletObject(){
        return this.leafletObject;
    }

    setStyle(style: L.PathOptions){
        this.leafletObject.setStyle(style);
    }
}

export function createGeometry(points: LocationPoint[][], type: GeometryType){
    return new Geometry(points, type);
}