import React, { ReactElement, createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapContainer from './MapContainer'
import * as L from "leaflet"
import Marker, { createMarker } from './Marker'
import Geometry, { GeometryType, createGeometry } from './Geometry';
import {} from "proj4leaflet"
import { LocationPoint } from './LocationPoint';
import GeometryMarker, { createGeometryMarker } from './GeometryMarker';
import { MapOptions } from './MapObject';
import MarkerLayer from './MarkerLayer';
import ClusterMarkerLayer from './ClusterMarkerLayer';


export interface CustomProjection{
    crs: L.CRS,
    transform: (location: LocationPoint) => LocationPoint
}

interface UseMapProps extends CustomProjection{
}

export default function useMap(props? : UseMapProps ) {
    
    const projection = props;
    const transform = projection?.transform || ((location: LocationPoint) => location);

    const maxZoom = useMemo(()=> {
        // @ts-ignore
        return projection ? projection.crs.options.resolutions.length - 2 : 18}, [projection?.crs.options.resolutions]);


    const divRef = useRef(null);
  
    const [map, setMap] = useState<MapOptions>()

    const [markers, setMarkers] = useState<Marker[]>([]);
    const [geometries, setGeometries] = useState<Geometry[]>([]);


    const MAP_NOT_INITIALIZED = "Map is not initialized yet. Try to use this function in useEffect with dependency on map. ";

    const [initialized, setInitialized] = useState(false);
    // Initialize map and set to the state
    const initializeMap = (afterCallback?: ()=>void) => {
        if(! divRef.current){
            console.log("Div-reference is null");
            return;
        };

        const htmlElement = divRef.current;

        try{
            const newMap = L.map(htmlElement, {
                zoomControl: false,
                ...(projection === undefined ? {} : {
                    crs: projection.crs
                }),
                maxZoom: maxZoom , // Because of the bug
    
            });
            newMap.setView([50.018127619248084, 14.296341504868012], maxZoom/2);
            
    
            L.tileLayer.wms("https://geoportal.cuzk.cz/WMS_ORTOFOTO_PUB/WMService.aspx", {
                layers: "GR_ORTFOTORGB",
                maxZoom : maxZoom, 
                styles: "",
                format: "image/png",
                transparent: true,
                version: "1.3.0",
                attribution: "ČÚZK"
            }).addTo(newMap);
    
    
            setMap(newMap);
        }catch(e){
            console.log("Map already exists");
        }
       
    }

    useEffect(()=>{
        if(!map)return;
        setInitialized(true);
    },[map])

    const container = useMemo(()=>MapContainer(divRef, initializeMap), []);


    
    // Add marker to the map and return it back
    const addMarker = ( marker: Marker) => {
        setMarkers((m)=>[...m, marker])
        return marker;
    }
    
    // Add geometry to the map and return it back
    const addGeometry = (geometry: Geometry) => {
        setGeometries((m)=>[...m, geometry])


        return geometry;
    }

    const createMarkerAndAdd = (latitude: number, longitude: number, marker: (marker: Marker, map: MapOptions)=>React.ReactElement) => {
        if(!map){
            console.log(MAP_NOT_INITIALIZED);
            return;
        }
        const loc = transform([latitude, longitude]);
        const m = createMarker(loc[0], loc[1], marker, map) ;
        addMarker( m);
        return m;
    }

    const createGeometryMarkerAndAdd = (points: LocationPoint[][], type: GeometryType, marker: (marker: GeometryMarker, map: MapOptions)=>React.ReactElement) => {
        if(!map){
            console.log(MAP_NOT_INITIALIZED);
            return;
        }
        const m = createGeometryMarker(points.map((p)=>{
            return p.map((p)=>{
                const loc = transform(p);
                return [loc[0], loc[1]];
            })
        }), type, marker, map) ;
        addMarker(m);
        return m;
    }
    const createGeometryAndAdd = (points: LocationPoint[][], type : GeometryType) => {
        
        const m = createGeometry(points.map((p)=>{
            return p.map((p)=>{
                const loc = transform(p);
                return [loc[0], loc[1]];
            })
        }), type) ;
        addGeometry( m);
        return m;
    }

    const createLayerAndAdd = () => {
        if(!map){
            console.log(MAP_NOT_INITIALIZED);
            return;
        }
        const l = new MarkerLayer(map);
        return l;

    }

    const createClusterLayerAndAdd = (element: (count: number)=>React.ReactElement) => {

        if(!map){
            console.log(MAP_NOT_INITIALIZED);
            return;
        }
        const l = new ClusterMarkerLayer(element, map);
        return l;
    }

    return {
        container,
        createMarker: createMarkerAndAdd,
        createGeometry: createGeometryAndAdd,
        createGeometryMarker: createGeometryMarkerAndAdd,
        createLayer: createLayerAndAdd,
        createClusterLayer: createClusterLayerAndAdd,
        // addMarker,
        // addGeometry,
        markers,
        geometries,
        projection,
        maxZoom,
        map,
        initialized
    }
}
