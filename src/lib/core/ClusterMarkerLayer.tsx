import L from "leaflet";
import 'leaflet.markercluster';
import MapObject, { MapOptions } from "./MapObject";
import MarkerLayer from "./MarkerLayer";
import { LocationPoint } from "./LocationPoint";
import Marker from "./Marker";
import { useState } from "react";

function ClusterMarkerContainer({element, mapObject}: {element: (count:number)=>React.ReactElement, mapObject: MapObject}){
    const clusterLayer = mapObject as ClusterMarkerLayer;
    const [count, setCount] = useState(clusterLayer.markerCount);
    clusterLayer.addListener("childrenchange", (children: MapObject[])=>{
        setCount(clusterLayer.markerCount);
    })

    return <div>
        {element(count)}
    </div>
}

export default class ClusterMarkerLayer extends Marker{
    protected radius: number;
    protected clusters: Record<number, Record<number, ClusterMarkerLayer>> = {}
    protected clustersArray: ClusterMarkerLayer[] = [];
    private groupingZoom : number;

    private _markerCount = 0;

    get markerCount(){
        return this._markerCount;
    }

    protected clusterReactElement: (count:number)=>React.ReactElement;

    constructor(reactElement: (count:number)=>React.ReactElement, map: MapOptions, radiusInPixels: number = 100, groupingZoom? : number, location?: LocationPoint){
        super(location ? location[0] : 0, location ? location[1] : 0, (marker: Marker, map: MapOptions)=>{
            return <ClusterMarkerContainer element={reactElement} mapObject={marker}/>
        }, map);
        this.name = "ClusterLayer";

        this.clusterReactElement = reactElement;
        this.radius = radiusInPixels;

        this.location = location || [0,0];

        this.groupingZoom = groupingZoom || map.getMinZoom();

        this.initialize();

    }

    private onZoom = (zoom:number)=>{
        const shouldBeGrouped = false;//zoom == this.groupingZoom;
        if(shouldBeGrouped){
            this.group();
        }else {
            this.ungroup();
        }

    }

    private group(){
        // if(this.children.length <= 1){
        //     this.ungroup()
            

        //     return;
        // }
        this.setMarkerVisibility(true)
        this.children.forEach( (child: MapObject)=>{
            this.setActive(false, false);
        })
    }
    private ungroup(){
        this.setMarkerVisibility(false)
        this.children.forEach( (child: MapObject)=>{
            this.setActive(true, false);
        })
    }

    private initialize(){
        this.map.on("zoomend", ()=>{
            this.onZoom(this.map.getZoom());
        })
    };

    add(marker: MapObject){
        this._markerCount++;
        super.add(marker);



        this.addToCluster(marker);
        this.setActive(true, true);
        this.onZoom(this.map.getZoom());
    }

    



    private addToCluster(marker: MapObject){

        if(this.groupingZoom > this.map.getMaxZoom()){
            return;
        }
        const point = this.map.project(marker.getLocation(),this.groupingZoom);
        const clusterXIndex = Math.floor(point.x / this.radius);
        const clusterYIndex = Math.floor(point.y / this.radius);

        

        if(!this.clusters[clusterXIndex]) this.clusters[clusterXIndex] = {};
        if(!this.clusters[clusterXIndex][clusterYIndex]){
            // Create new cluster if it doesn't exist
            const cluster = new ClusterMarkerLayer(this.clusterReactElement, this.map, this.radius, this.groupingZoom+1,marker.getLocation());
            this.clusters[clusterXIndex][clusterYIndex] = cluster;
            super.add(cluster);
            this.clustersArray.push(this.clusters[clusterXIndex][clusterYIndex]);
        }

        this.clusters[clusterXIndex][clusterYIndex].add(marker);

    }



}