import 'leaflet.markercluster';
import MapObject, { MapOptions } from "./MapObject";
import MarkerLayer from './MarkerLayer';
import Marker from './Marker';
import { useMemo } from 'react';
import { v4 as uuid } from 'uuid';


class ClusterLayer{

    private _id: string;
    private get id(){
        return this._id;
    }

    private map: MapOptions;
    protected radius: number;

    private groupingZoomStart: number;
    private groupingZoomEnd: number;

    private parentCluster: ClusterLayer | undefined;
    private mainParentCluster: ClusterLayer;


    private clusters: Record<number, Record<number, ClusterLayer>> = {};
    private clustersArray: ClusterLayer[] = [];

    private firstSubclustersIndex: Record<number, [number, number]> = {};

    // All objects in this and all below clusters 
    private objects: MapObject[] = []; 
    // Objects that are only in this cluster
    private onlyHereObjects: MapObject[] = [];

    private marker: Marker;
    private markerLayer: MarkerLayer;

    private isClustersParent = false;
    private get isObjectsParent (){
        return !this.isClustersParent;
    }


    constructor(map: MapOptions, groupingZoomStart: number, radiusInPixels: number, parentCluster?: ClusterLayer, mainParentCluster?: ClusterLayer){

        this._id = uuid()
                
        console.log("New cluster created with id:", this.id)

        this.groupingZoomStart = groupingZoomStart;
        this.groupingZoomEnd = groupingZoomStart;

        this.map = map;
        this.radius = radiusInPixels;

        this.mainParentCluster = mainParentCluster || this;

        this.markerLayer = new MarkerLayer(map);

        this.marker = new Marker(0,0,()=>{
            const num = useMemo(()=>Math.random(),[])
            return <div style={{backgroundColor:"white"}}>
                {Math.round(num*1000)}
            </div>
        }, map)

        this.setClusterParent(parentCluster)

        

        this.initialize()

        this.redisplay()
    }

    private setClusterParent(parent?: ClusterLayer){
        this.parentCluster = parent;

        if(!this.marker){
            console.log("Marker is undefined");
            return;
        }

        this.parentCluster?.markerLayer.add(this.marker);
    }

    private initWithSubclusters(subclusters: Record<number, Record<number, ClusterLayer>>){

        this.clusters = subclusters;
        this.clustersArray = [];

        Object.keys(subclusters).forEach((x: any)=>{
            Object.keys(subclusters[x]).forEach((y: any)=>{
                this.clustersArray.push(subclusters[x][y]);
            })
        })


        console.log(this.clustersArray)

        this.clustersArray.forEach((cluster)=>{
            cluster.setClusterParent(this);
        })

        this.isClustersParent = true;
        this.groupingZoomEnd = this.clustersArray[0].groupingZoomStart-1;

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

        this.markerLayer.add(object);


        this.assignToCluster(object);

        if(this.clustersArray.length != 0){
            this.onlyHereObjects = [];
        }

        // object.setActive(false); // temporary

        this.redisplay()

    }

    private isFinalCluster(zoom: number){
        if(this.mainParentCluster.getMaxSublayerCount() >= this.map.getMaxZoom()) return true;
        return zoom >= this.map.getMaxZoom();
    }

    private getClusterIndexes(object: MapObject, zoom: number) : [number, number]{
        const point = this.map.project(object.getLocation(),zoom);
        const clusterXIndex = Math.floor(point.x / this.radius);
        const clusterYIndex = Math.floor(point.y / this.radius);
        return [clusterXIndex, clusterYIndex]
    }

    private assignToCluster(object: MapObject){

        // console.log("ADDING NEW OBJECT")

        let currentZoom = this.groupingZoomStart;

        while(! this.isFinalCluster(currentZoom)){


            // console.log("Running loop with zoom "+ currentZoom +" and for cluster with id: " + this.id)

            // Get cluster position index
            const clusterIndexes = this.getClusterIndexes(object, currentZoom);
            
            if(!this.firstSubclustersIndex[currentZoom]) 
                this.firstSubclustersIndex[currentZoom] = clusterIndexes;

            // Vice moznosti
            //   1. Vsechny objecty spadaji do stejneho subclusteru nebo je toto prvni
            //      - neni zadny treba vytvaret
            //   2. Vsechny predchozi objekty spadaji do jednoho clusteru, a ten jeste neni vytvoren. Novy spada do jineho. 
            //      - treba roztridit vsechny predchozi objekty do subclusteruu
            //   3. Tento cluster obsahuje jiz sve subclustery a tento novy je tedy potreba jen zaradit do spravneho

            // 

            const isSameCluster = clusterIndexes[0] == this.firstSubclustersIndex[currentZoom][0] && clusterIndexes[1] == this.firstSubclustersIndex[currentZoom][1]
            const noSubclustersNeeded = this.clustersArray.length == 0 && isSameCluster;
            const isFirstDifferentCluster = this.clustersArray.length == 0 && !(isSameCluster)
            const justAddToCluster = !(noSubclustersNeeded);

            if(noSubclustersNeeded){

                currentZoom++;
                if(currentZoom>this.groupingZoomEnd) 
                    this.groupingZoomEnd = currentZoom;

                if(this.isFinalCluster(currentZoom)){
                    this.onlyHereObjects.push(object);
                    break;
                }
                this.isClustersParent = false;
                continue;

            }else if(isFirstDifferentCluster){
                // Just reorder existing objects and assign to their clusters
                
                // 1. Set new end grouping zoom and delete all records of previous subclusters
                for(let i = currentZoom+1; i <= this.groupingZoomEnd; i++){
                    delete this.firstSubclustersIndex[i];   // This is not needed
                }
                this.groupingZoomEnd = currentZoom;

                // console.log("\t",this.id, " has been cut off.")
                // console.log("\t", "All previously existing object will be moved to new cluster")

                const newClusterIndex = this.firstSubclustersIndex[currentZoom];
                
                // 2. Create new cluster
                
                const cluster = new ClusterLayer(this.map, this.groupingZoomEnd+1, this.radius, this, this.mainParentCluster);
                
                // 3. Transfer all existing objects to new cluster
                this.onlyHereObjects.forEach((o)=>{
                    cluster.add(o);
                });
                
                if(!this.clusters[newClusterIndex[0]]) this.clusters[newClusterIndex[0]] = {};
                this.clusters[newClusterIndex[0]][newClusterIndex[1]] = cluster;
                this.clustersArray.push(cluster);

 
                // console.log("\t","All previously existing object has been moved to new cluster:", cluster.id)
                
                // 4. Clear onlyHereObjects array
                this.onlyHereObjects = [];
                
                this.isClustersParent = true;

            }
            
            if(justAddToCluster){
                this.groupingZoomEnd = currentZoom;


                // Check if new object is on the same zoom level as already existing clusters
                const previousZoomLevel = this.clustersArray[0].groupingZoomStart;
                const isSameZoomLevel = previousZoomLevel == currentZoom+1;
                
                
                // If not, reoorganize previous clusters
                if(!isSameZoomLevel){
                    // console.log("\tNew object belongs to cluster with different zoom level (",this.groupingZoomEnd+1,"vs",previousZoomLevel,"). \nReorganizing subclusters in cluster with id:", this.id)

                    const previousClusters = this.clusters;

                    // console.log(this.firstSubclustersIndex, "Target:", currentZoom+1)
                    
                    const previousObjectsClusterIndex = this.getClusterIndexes(object, currentZoom+1);
                    const x = previousObjectsClusterIndex[0];
                    const y = previousObjectsClusterIndex[1];


                    // Empty clusters
                    this.clustersArray = [];
                    this.clusters = {};
                    this.firstSubclustersIndex = {};

                    if(!this.clusters[x]) this.clusters[x] = {};

                    // Create cluster if it doesn't exist
                    if(!this.clusters[x][y]){
                        const cluster = new ClusterLayer(this.map, currentZoom+1, this.radius, this, this.mainParentCluster);
                        this.clusters[x][y] = cluster;
                        this.clustersArray.push(this.clusters[x][y]);

                        // console.log("\t","Created in condition cluster with id:", cluster.id)
                    }

                    this.clusters[x][y].initWithSubclusters(previousClusters);

                }



                // But always just add to cluster
                const x = clusterIndexes[0];
                const y = clusterIndexes[1];
                if(!this.clusters[x]) this.clusters[x] = {};

                // Create cluster if it doesn't exist
                if(!this.clusters[x][y]){
                    // console.log("\tNew object belongs to cluster that doesn't exist yet. \n\tCreating new cluster and adding object to it.")
                    const cluster = new ClusterLayer(this.map, this.groupingZoomEnd+1, this.radius, this, this.mainParentCluster);
                    this.clusters[x][y] = cluster;
                    this.clustersArray.push(cluster);
                }
                this.clusters[x][y].add(object);
                // console.log("\t","Object added to cluster with id:", this.clusters[x][y].id)
                
                
                
            }

            break;
        }
        
        
    }


    private initialize(){
        this.map.on("zoomend", (e)=>{
            this.redisplay()
        })

        this.markerLayer.addListener("locationchange", ()=>{
            this.marker.setLocation(this.markerLayer.getLocation());

        })
        this.marker.setLocation(this.markerLayer.getLocation());

        this.redisplay()
    }

    private redisplay(){
        this.display(this.map.getZoom());
    }

    private display(zoom: number){
        if( zoom >= this.groupingZoomStart){
            this.ungroup();
        }else {
            this.group();
        }

        // console.log("Displaying cluster layer at zoom: ", zoom, " with grouping zoom: ", this.groupingZoom);

        if (zoom >= this.groupingZoomStart && zoom <= this.groupingZoomEnd && this.isClustersParent){
            this.marker.setActive(true);

        }else{
            this.marker.setActive(false);
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

    public log() : any{

        const data = {
            id: this.id,
            zoom: [this.groupingZoomStart, this.groupingZoomEnd],

        }
        return this.clustersArray.length>0 ? 
        {
            ...data,
            clusters: this.clustersArray.map((cluster)=>cluster.log())
        }
        :
        {
            ...data,
            objects: this.onlyHereObjects.map((object)=>object.id)
        }
        
    }
}

export default class ClusterMarkerLayer extends MapObject{
    protected clusterReactElement: (count:number)=>React.ReactElement;

    private mainCluster;

    constructor(reactElement: (count:number)=>React.ReactElement, map: MapOptions, radiusInPixels: number = 200){
        super(map,"ClusterLayer");

        this.clusterReactElement = reactElement;

        this.mainCluster = new ClusterLayer(map, map.getMinZoom(), radiusInPixels);
    }


    add(marker: MapObject){
        super.add(marker);
        this.mainCluster.add(marker);

        console.log(this.mainCluster.log())
    }



}