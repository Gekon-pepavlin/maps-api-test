import 'leaflet.markercluster';
import MapObject, { MapOptions } from "./MapObject";
import MarkerLayer from './MarkerLayer';
import Marker from './Marker';
import { useMemo } from 'react';

class ClusterLayer{

    private map: MapOptions;
    protected radius: number;
    private groupingZoom: number;

    private parentCluster: ClusterLayer | undefined;
    private mainParentCluster: ClusterLayer;

    private clusters: Record<number, Record<number, ClusterLayer>> = {};
    private clustersArray: ClusterLayer[] = [];

    // All objects in this and all below clusters 
    private objects: MapObject[] = []; 
    // Objects that are only in this cluster
    private onlyHereObjects: MapObject[] = [];

    private marker: Marker;
    private markerLayer: MarkerLayer;


    constructor(map: MapOptions, groupingZoom: number, radiusInPixels: number, parentCluster?: ClusterLayer, mainParentCluster?: ClusterLayer){
        this.groupingZoom = groupingZoom;
        this.map = map;
        this.radius = radiusInPixels;

        this.parentCluster = parentCluster;
        this.mainParentCluster = mainParentCluster || this;

        this.markerLayer = new MarkerLayer(map);

        this.marker = new Marker(0,0,()=>{
            const num = useMemo(()=>Math.random(),[])
            return <div style={{backgroundColor:"white"}}>
                {num}
            </div>
        }, map)


        this.parentCluster?.markerLayer.add(this.marker);

        

        this.initialize()

        this.redisplay()
    }

    getClusters(){
        return this.clustersArray;
    }

    getObjects(){
        return this.objects;
    }

    add(object: MapObject){
        // Add to all objects array
        this.objects.push(object);


        // Check if this is the first object in this cluster
        const previousCount = this.objects.length;
        
        // If this is the first object in this cluster, add without creating subclusters
        if(previousCount == 0 || this.noMoreClusters()){
            this.onlyHereObjects.push(object);
            this.markerLayer.add(object);
        }
        
        // If this is the second object in this cluster, create subclusters and add first object to them
        if(previousCount == 1){
            if(! this.noMoreClusters()){
                this.assignToCluster(this.objects[0]);
                this.onlyHereObjects.shift();
            }
        }

        // Add to subclusters all next objects
        if(previousCount > 0){
            this.assignToCluster(object);
        }

        // object.setActive(false); // temporary

        this.redisplay()

    }

    private noMoreClusters(){
        if(this.mainParentCluster.getMaxSublayerCount() >= 17) return true;
        return this.groupingZoom >= this.map.getMaxZoom();
    }

    private assignToCluster(object: MapObject){

        if(this.noMoreClusters()) return;
        
        // Get cluster position index
        const point = this.map.project(object.getLocation(),this.groupingZoom);
        const clusterXIndex = Math.floor(point.x / this.radius);
        const clusterYIndex = Math.floor(point.y / this.radius);
        
                
        // Create cluster arr if it doesn't exist
        if(!this.clusters[clusterXIndex]) this.clusters[clusterXIndex] = {};

        // Create cluster if it doesn't exist
        if(!this.clusters[clusterXIndex][clusterYIndex]){
            const cluster = new ClusterLayer(this.map, this.groupingZoom+1, this.radius, this, this.mainParentCluster);
            this.clusters[clusterXIndex][clusterYIndex] = cluster;
            this.clustersArray.push(this.clusters[clusterXIndex][clusterYIndex]);
        }

        this.clusters[clusterXIndex][clusterYIndex].add(object);
        
    }

    private initialize(){
        this.map.on("zoomend", (e)=>{
            this.redisplay()
        })

        this.markerLayer.addListener("locationchange", ()=>{
            this.marker.setLocation(this.markerLayer.getLocation());
            console.log("Marker location", this.marker.getLocation(),this.marker.id);

        })
        this.marker.setLocation(this.markerLayer.getLocation());

        this.redisplay()
    }

    private redisplay(){
        this.display(this.map.getZoom());
    }

    private display(zoom: number){
        if( zoom >= this.groupingZoom){
            this.ungroup();
        }else {
            this.group();
        }

        // console.log("Displaying cluster layer at zoom: ", zoom, " with grouping zoom: ", this.groupingZoom);

        if (zoom !== this.groupingZoom ){
            this.marker.setActive(false);

        }else{
            this.marker.setActive(true);
        }
        
    }

    private group(){
        this.onlyHereObjects.forEach((o)=>{
            o.setActive(false);
        })
    }

    private ungroup(){
        this.onlyHereObjects.forEach((o)=>{
            o.setActive(true);
        })
    }

    getMaxSublayerCount(){
        
        if(this.clustersArray.length>0){
            let max = 0;
            this.clustersArray.forEach( (cluster)=>{
                const count = cluster.getMaxSublayerCount();
                if(count > max) max = count;
            })
            return max+1;
        }
        return 0;
    }
}

export default class ClusterMarkerLayer extends MapObject{
    protected clusterReactElement: (count:number)=>React.ReactElement;

    private mainCluster;

    constructor(reactElement: (count:number)=>React.ReactElement, map: MapOptions, radiusInPixels: number = 50){
        super(map,"ClusterLayer");

        this.clusterReactElement = reactElement;

        this.mainCluster = new ClusterLayer(map, map.getMinZoom(), radiusInPixels);
    }


    add(marker: MapObject){
        super.add(marker);
        this.mainCluster.add(marker);

        console.log("Max sublayer count: ", this.mainCluster.getMaxSublayerCount());
    }



}