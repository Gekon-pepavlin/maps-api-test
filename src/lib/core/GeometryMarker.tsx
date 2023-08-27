import L from "leaflet";
import { LocationPoint } from "./LocationPoint";
import Marker from "./Marker";
import { GeometryType } from './Geometry';
import { MapOptions } from "./MapObject";

export default class GeometryMarker extends Marker{
    private leafletObject: L.Polygon | L.Polyline;

    // @ts-ignore
    svgPathHtmlElement: HTMLElement;

    private points: LocationPoint[][] = [];
    private geometryType: GeometryType;
    
    constructor( points: LocationPoint[][], type: GeometryType, marker: (marker: GeometryMarker, map: any)=>React.ReactElement, map: MapOptions){
        super(0,0, marker as (marker: Marker, map: any)=>React.ReactElement, map);
        this.geometryType = type;
        this.leafletObject = type == "polygon" ? L.polygon(points) : L.polyline(points);  
        this.points = points; 
    }

    setActive(isActive: boolean){
        if(isActive === this.isActive) return;
        this.isActive = isActive;

        if(!this.map) return;
        if( this.isActive ){
            this.leafletObject.addTo( this.map );   
            
            // @ts-ignore
            this.svgPathHtmlElement = this.leafletObject._path;
            this.svgPathHtmlElement.setAttribute("pointer-events", "auto");

            
            // Disable click propagation to leaflet map
            this.leafletObject.on("click", (e: any)=>{
                L.DomEvent.disableClickPropagation(e.target);
            });


        }else{
            this.leafletObject.removeFrom( this.map );
        }

        super.setActive(isActive, true);


        if(this.isActive){
            // Save and set the center of the polygon   
            
            let sum = {lat: 0, lng: 0};

            const flatten = this.points.flat();
            if(flatten.length > 0){
                flatten.forEach( (point: LocationPoint)=>{
                    sum.lat += point[0];
                    sum.lng += point[1];
                });
                sum.lat = sum.lat / flatten.length;
                sum.lng = sum.lng / flatten.length;

            }
            const center = sum;
            this.marker.setLatLng(center);
            this.location = [center.lat, center.lng];  
        
        }
        
    }

    getPoints(): LocationPoint[][]{
        return this.points;
    }
    
    setPoints(points: LocationPoint[][]){
        this.points = points;
        this.leafletObject.setLatLngs(points);
    }

    getLeafletObject(){
        return this.leafletObject;
    }
}

export function createGeometryMarker( points: LocationPoint[][], type: GeometryType, marker: (marker: GeometryMarker, map: any)=>React.ReactElement, map: MapOptions){
    return new GeometryMarker(points, type, marker, map);
}