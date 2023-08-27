import L, { LatLngExpression } from 'leaflet';
import React from 'react'
import { renderToString } from 'react-dom/server';
import MarkerLayer from './MarkerLayer';
import ReactDOM from 'react-dom/client';
import { LocationPoint } from './LocationPoint';
import MapObject, { MapOptions } from './MapObject';

const MarkerContainer = ({marker, map, element}:{marker: Marker, map: MapOptions, element: (marker:Marker, map:MapOptions)=>React.ReactElement}) => {
    const [visible, setVisible] = React.useState(true);
    marker.addListener("visibilitychnage", (isActive: boolean)=>{
        setVisible(marker.getMarkerVisibility());
    })
    return <div style={{position: "absolute", display: visible?"block":"none"}}>
        {element(marker, map)}
    </div>
}

export default class Marker extends MapObject{
    protected marker : L.Marker;
    location: LocationPoint;
    isActive: boolean = false;
    private visible: boolean = true;

    // @ts-ignore
    htmlElement: HTMLElement;

    protected reactElement: (marker: Marker, map: MapOptions)=>React.ReactElement;

    constructor(latitude: number, longitude: number, marker: (marker: Marker, map: MapOptions)=>React.ReactElement, map: MapOptions){
        super(map, "Marker");
        this.reactElement = marker;
        const html = "<div></div>";
        
        const size = 0;
        const icon  = L.divIcon({
            className: "marker-div",
            html,
            iconSize: [size,size],
            iconAnchor: [0,0]
        }); 
        
        this.location = [latitude, longitude];
        this.marker = L.marker([latitude, longitude], {icon});
        this.marker.on("add", (e)=>{
            if(!this.map){
                console.error("Cannot continue in add callback - Map not attached to marker");
                return;
            }
            const htmlElement = e.target._icon;
            this.htmlElement = htmlElement;

            
            const htmlRoot = ReactDOM.createRoot(htmlElement);
            htmlRoot.render(<MarkerContainer marker={this} map={this.map} element={this.reactElement}/>)

        // Disable click propagation to leaflet map
        L.DomEvent.disableClickPropagation(this.htmlElement);
        
        })
        this.marker.addTo(map);
        this.setActive(true, true);

    }


    getMarkerVisibility(){
        return this.visible;
    }

    setLocation(location: LocationPoint){
        super.setLocation(location);
        this.marker.setLatLng(this.location);
    }


    setActive(isActive: boolean, force: boolean = false) : any{
        this.setMarkerVisibility(isActive);
        if(!super.setActive(isActive, force)) return;

    }

    setMarkerVisibility(visible: boolean){
        this.visible = visible;

        this.callEventCallback("visiblitychange", visible);

    }



    getLeafletMarker(){
        return this.marker;
    }

    addToLayer(layer?: MarkerLayer){
        super.setParent(layer);
    }

    

}

export function createMarker(latitude: number, longitude: number, marker: (marker: Marker, map: MapOptions)=>React.ReactElement, map: MapOptions){
    return new Marker(latitude, longitude, marker, map);
}