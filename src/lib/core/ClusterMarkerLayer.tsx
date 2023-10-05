import 'leaflet.markercluster';
import MapObject, { MapOptions } from "./MapObject";
import MarkerLayer from './MarkerLayer';
import Marker from './Marker';
import React from 'react';
import { v4 as uuid } from 'uuid';
import { LocationPoint } from './LocationPoint';
import { start } from 'repl';
import { measureTime } from '../../utils';


type GroupsDict = Record<number, Record<number, Group>>;

interface Group{
    x: number;
    y: number;
    zoom: number;
    objects: MapObject[];
    groupsDict: GroupsDict;
    groups: Group[];
}

interface ClusterData{
    startZoom: number;
    endZoom: number;
    clusters: ClusterData[];
    objects: MapObject[];
}

class Cluster{
    id: string;

    map: MapOptions;
    radius: number;
    startZoom: number;
    endZoom: number;
    objects: MapObject[];
    clusters: Cluster[] = [];
    parentCluster?: Cluster;

    allSubObjectsCount: number;


    private marker: Marker = undefined as any;
    markerLayer: MarkerLayer = undefined as any;

    private reactElement: (count:number)=>React.ReactElement;

    private _onRelase?: ()=>void;

    private isActive = true;
    private isInnerActive = false;

    constructor(
        map: MapOptions,
        radiusInPixels: number,
        startZoom: number,
        endZoom: number,
        objects: MapObject[],
        clustersData: ClusterData[],
        reactElement: (count:number)=>React.ReactElement,
        parentCluster?: Cluster
    ){
        this.id = uuid();

        this.map = map;
        this.radius = radiusInPixels;
        this.startZoom = startZoom;
        this.endZoom = endZoom;
        this.objects = objects;
        this.parentCluster = parentCluster;

        this.reactElement = reactElement;

        this.clusters = clustersData.map((data) => createCluster(data, map, radiusInPixels, reactElement, this));
        
        this.allSubObjectsCount = objects.length + this.clusters.reduce((acc, cluster)=>acc + cluster.allSubObjectsCount, 0);
        
        

    }

    public initialize(){

        this.markerLayer = measureTime(()=>
            new MarkerLayer(this.map),
            "Creating marker layer"
        )

        measureTime( ()=> {
            this.marker = new Marker(0,0,(marker, map)=>{
                const onClick = () =>{
                    map.flyTo(marker.getLocation(), this.endZoom+1);
                }
    
                return <div onClick={onClick}>
                    {this.reactElement(this.allSubObjectsCount)}
                </div>
            }, this.map)
            this.marker.setActive(false)
    
            this.objects.forEach((object)=>{
                object.setActive(false);
            })
        }, "Creating marker");
        


        measureTime( ()=> {
            this.markerLayer.add(this.objects)

            this.parentCluster?.markerLayer.add(this.marker);
        }, "Adding objects to marker layer")
        

        const onLocationChange = () =>{
            this.marker.setLocation(this.markerLayer.getLocation());
        }

        measureTime( ()=> {
            this.markerLayer.addListener("locationchange", onLocationChange)
            this.marker.setLocation(this.markerLayer.getLocation());
        },"Setting up location change listener");
        


        this._onRelase = () => {
            this.markerLayer.removeListener("locationchange", onLocationChange)
            this.marker.delete();

        }

        this.clusters.forEach((cluster)=>{
            cluster.initialize();
        });
    }
    
    redisplay(){
        // console.log("Redisplaying cluster")
        this._display(this.map.getZoom());
    }

    private _display(zoom: number){
        // console.log(this.startZoom, this.endZoom)
        if (zoom >= this.startZoom && zoom <= this.endZoom && this.clusters.length>0 && this.isActive){
            this.marker.setActive(true);

        }else{
            this.marker.setActive(false);

        }

        

        if(zoom >= this.startZoom && this.isActive){
            this.objects.forEach((o)=>{
                o.setActive(true);
            })
        }else{
            this.objects.forEach((o)=>{
                o.setActive(false);
            })
        }

        this.isInnerActive = zoom >= this.startZoom && zoom <= this.endZoom;
        
    }

    getAllSubclusters() : Cluster[]{
        return this.clusters.reduce((acc, cluster)=>{
            return [...acc, ...cluster.getAllSubclusters()]
        }, this.clusters)
    }
    // onZoomChange(score: number = -1){
    //     const IGNORE_OPTIMIZATION = true;

    //     const mainHandlerCall = score < 0;
    //     if(score<0) score = 0;

    //     const startTime = performance.now();
    //     if(mainHandlerCall){
    //         console.log("On zoom change started")
    //     }

    //     const zoom = this.map.getZoom();
    //     const willBeThisActive = zoom >= this.startZoom && zoom <= this.endZoom
    //     const wasActive = this.isInnerActive;
    //     const isNotSame = willBeThisActive !== wasActive;

    //     const shouldBeRedisplayed = isNotSame; //TODO
        
        
    //     if(shouldBeRedisplayed || IGNORE_OPTIMIZATION){
    //         score++;
    //         this.redisplay();
    //     }
        
    //     const sendSignalToSubclusters = score<2; //TODO: check if this is needed


    //     if(sendSignalToSubclusters || IGNORE_OPTIMIZATION)
    //         this.clusters.forEach((cluster)=>{
    //             cluster.onZoomChange(score);
    //         })

        
    //     if(mainHandlerCall){
    //         const endTime = performance.now();
    //         const time = endTime - startTime;
    //         console.log("On zoom change ended with time", time, "ms")
    //     }
    // }

    


    // Use for clean up before deleting
    release(){
        this.clusters.forEach((cluster)=>{
            cluster.release();
        });

        this._onRelase?.();

    }

    setActive(isActive: boolean){
        this.clusters.forEach((cluster)=>{
            cluster.setActive(isActive);
        })

        if(this.isActive === isActive) return;
        this.isActive = isActive;
        this._display(this.map.getZoom());
    }

    getTotalSubclustersCount(){
        let count = 0;
        this.clusters.forEach((cluster)=>{
            count += cluster.getTotalSubclustersCount();
        })
        return count + this.clusters.length;
    }

    log() : any{
        const data = {
            id: this.id,
            zoom: [this.startZoom, this.endZoom],

        }
        return this.clusters.length>0 ? 
        {
            ...data,
            clusters: this.clusters.map((cluster)=>cluster.log()),
            subclustersCount: this.getTotalSubclustersCount()
        }
        :
        {
            ...data,
            objects: this.objects.map((object)=>object.id)
        }
        
    }
}

function createCluster(data: ClusterData, map: MapOptions, radiusInPixels: number, 
        reactElement: (count:number)=>React.ReactElement,parentCluster?: Cluster){
    const cluster =  new Cluster(
        map,
        radiusInPixels,
        data.startZoom,
        data.endZoom,
        data.objects,
        data.clusters,
        reactElement,
        parentCluster
    )

    return cluster;
}

export default class ClusterMarkerLayer extends MapObject{
    protected clusterReactElement: (count:number)=>React.ReactElement;

    private radius: number;


    private mainClusters: Cluster[] = [];
    private clustersByZoom: Record<number, Cluster[]> = {};

    private objects: MapObject[] = [];

    private _onZoomEnd = this._onZoomChange.bind(this);

    constructor(reactElement: (count:number)=>React.ReactElement, map: MapOptions, radiusInPixels: number = 200){
        super(map,"ClusterLayer");

        this.clusterReactElement = reactElement;
        this.radius = radiusInPixels;

        // This marker fix the bug. If all submarker is not active, this is. The layer stays active
        const justMarker = new Marker(30,30,()=>{
            return <></>
        }, map);

        super.add(justMarker)

        map.on("zoomend", this._onZoomEnd);
    }

    private _lastZoom = -1;
    private _onZoomChange(){
        measureTime(()=>{
            const currentZoom = this.map.getZoom();

            const willBeActive = this.clustersByZoom[currentZoom];
            willBeActive?.forEach((cluster)=>{
                cluster.redisplay()
            });

            if(this._lastZoom >= 0 && this._lastZoom !== currentZoom){
                const wasActive = this.clustersByZoom[this._lastZoom];
                const filteredWasActive = wasActive?.filter((cluster)=>willBeActive.indexOf(cluster)<0);
                filteredWasActive?.forEach((cluster)=>{
                    cluster.redisplay()
                });
            }


            this._lastZoom = currentZoom;
        }, "On zoom change", true);
        
    }


    add(marker: MapObject | MapObject[]){
        super.add(marker);
        
        if(Array.isArray(marker)){
            this.objects.push(...marker);
        }else{
            this.objects.push(marker);
        }

        this._set(this.objects);

    }


    private _set(markers: MapObject[]){
        console.log("Starting to split to clusters of total count", markers.length)

        const clusters = measureTime(()=> 
            this._splitToClusters(markers) , 
            "Split to clusters");

        this.mainClusters.forEach((cluster)=>{
            cluster.release();
        });
        
        this.mainClusters = measureTime(()=>
            clusters.map((data) => createCluster(data, this.map, this.radius, this.clusterReactElement)),
            "Creating clusters");

        measureTime(()=>{
            this.mainClusters.forEach((cluster)=>{
                const allSubclusters = [cluster, ...cluster.getAllSubclusters()]; // Including itself
                
                allSubclusters.forEach((subcluster)=>{
                    for(let zoom = subcluster.startZoom; zoom <= subcluster.endZoom; zoom++){
                        if(!this.clustersByZoom[zoom]) this.clustersByZoom[zoom] = [];
                        this.clustersByZoom[zoom].push(subcluster);
                    }
                })
            })
        }, "Passing clusters to zoom dictionary", true);

        measureTime(()=>
            this.mainClusters.forEach((cluster)=>{
            cluster.initialize();
        }), "Initializing clusters");

        measureTime(()=>
            this.mainClusters.forEach((cluster)=>{
                super.add(cluster.markerLayer);
            }),
            "Adding marker layers to one layer");
        

        this._onZoomEnd();

    }
    //#region SPLIT_TO_CLUSTERS functions

    private _splitToClusters(markers: MapObject[]) : ClusterData[]{
        


        const mainGroupsDict : GroupsDict = [];
        const mainGroups : Group[] = [];
        const min = this.map.getMinZoom();
        const max = this.map.getMaxZoom();

        measureTime(()=> {
            markers.forEach((marker)=>{
                let lastGroup : Group | undefined;
    
                const location = marker.getLocation();
    
                for(let i = min; i <= max; i++){
                    const [x,y] = this._getClusterIndexes(location, i);
    
                    const parentGroups = lastGroup ? (lastGroup as Group).groupsDict : mainGroupsDict;
    
                    if(!parentGroups[x]) parentGroups[x] = {};
                    if(!parentGroups[x][y]) parentGroups[x][y] = {
                        x, y, zoom: i,
                        objects: [],
                        groupsDict: {},
                        groups: []
                    };
    
                    const currentGroup : Group = parentGroups[x][y];
                    if(lastGroup && lastGroup.groups.indexOf(currentGroup) < 0) lastGroup.groups.push(currentGroup);
                    if(!lastGroup && mainGroups.indexOf(currentGroup) < 0) mainGroups.push(currentGroup);
    
    
                    if(i === max)
                        currentGroup.objects.push(marker);
    
                    lastGroup = currentGroup;
    
                
    
                }
               
    
    
            });
        }, "Splitting to groups");
        


        const result = measureTime(()=> 
            mainGroups.map((group)=>{
                return this._simplifyGroup(group);
            }),
            "Simplifying groups")
        

        return result;
    }

    private _simplifyGroup(group: Group) : ClusterData{

        const cluster : ClusterData = {
            startZoom: group.zoom,
            endZoom: group.zoom,
            clusters: [],
            objects: group.objects
        }

        const clusters = group.groups.map((group)=>{
            return this._simplifyGroup(group);
        });

        if(clusters.length === 1){
            cluster.endZoom = clusters[0].endZoom;
            cluster.clusters = clusters[0].clusters;
            cluster.objects = [...cluster.objects, ...clusters[0].objects];
        }
        if(clusters.length > 1)
            cluster.clusters = clusters;
        


        return cluster;
    }

    private _getClusterIndexes(objectLocation: LocationPoint, zoom: number) : [number, number]{
        const point = this.map.project(objectLocation,zoom);
        const clusterXIndex = Math.floor(point.x / this.radius);
        const clusterYIndex = Math.floor(point.y / this.radius);
        return [clusterXIndex, clusterYIndex]
    }
    //#endregion

    setActive(isActive: boolean, force?: boolean) {
        super.setActive(isActive, force, true);

        this.mainClusters.forEach((cluster)=>{
            cluster.setActive(isActive);
        })

    }

    delete(): void {
        super.delete();
        this.mainClusters.forEach((cluster)=>{
            cluster.release();
        });
        this.map.off("zoomend", this._onZoomEnd);
    }


}