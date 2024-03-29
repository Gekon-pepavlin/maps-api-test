import 'leaflet.markercluster';
import MapObject, { MapOptions } from "./MapObject";
import MarkerLayer from './MarkerLayer';
import Marker from './Marker';
import React from 'react';
import { v4 as uuid } from 'uuid';
import { LocationPoint } from './LocationPoint';


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

    private isActive = false;
    private isInnerInitialized = false;

    private useAverageLocation: boolean = true;

    constructor(
        map: MapOptions,
        radiusInPixels: number,
        useAverageLocation: boolean,
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
        this.useAverageLocation = useAverageLocation;
        this.startZoom = startZoom;
        this.endZoom = endZoom;
        this.objects = objects;
        this.parentCluster = parentCluster;

        this.reactElement = reactElement;

        this.clusters = clustersData.map((data) => createCluster(data, map, radiusInPixels, useAverageLocation, reactElement, this));
        
        this.allSubObjectsCount = objects.length + this.clusters.reduce((acc, cluster)=>acc + cluster.allSubObjectsCount, 0);
        
        

    }

    public initialize(){

        this.markerLayer = new MarkerLayer(this.map)
        this.markerLayer.setUseAverageLocation(this.useAverageLocation);

        this.marker = new Marker(0,0,(marker, map)=>{
            const onClick = () =>{
                map.flyTo(marker.getLocation(), this.endZoom+1);
            }

            return <div onClick={onClick}>
                {this.reactElement(this.allSubObjectsCount)}
            </div>
        }, this.map)
        this.marker.setActive(false)
        


        this.markerLayer.add(this.objects)

        this.parentCluster?.markerLayer.add(this.marker);
    

        const onLocationChange = () =>{
            this.marker.setLocation(this.markerLayer.getLocation());
        }

        this.markerLayer.addListener("locationchange", onLocationChange)
        this.marker.setLocation(this.markerLayer.getLocation());
        


        this._onRelase = () => {
            this.markerLayer.removeListener("locationchange", onLocationChange)
            this.marker.delete();

        }

        this.clusters.forEach((cluster)=>{
            cluster.initialize();
        });

        this.isInnerInitialized = true;
    }

    public initializeObjects(){
        this.marker.initialize();
        this.markerLayer.initialize();

        this.clusters.forEach((cluster)=>{
            cluster.initializeObjects();
        })
    }
    
    redisplay(force: boolean = false){
        this._display(this.map.getZoom(), force);
    }

    private _display(zoom: number, force?: boolean){
        if(!this.isInnerInitialized) return;
        if (zoom >= this.startZoom && zoom <= this.endZoom && this.clusters.length>0 && this.isActive){
            this.marker?.setActive(true);
            this.marker?.initialize();

        }else{
            this.marker?.delete()

        }

        

        if(zoom >= this.startZoom && this.isActive){
            this.objects.forEach((o)=>{
                this.markerLayer.add(o);
                o.setActive(true);
                o.initialize()
            })
        }else{
            this.objects.forEach((o)=>{
                o.delete()
            })
        }
    }

    getAllSubclusters() : Cluster[]{
        return this.clusters.reduce((acc, cluster)=>{
            return [...acc, ...cluster.getAllSubclusters()]
        }, this.clusters)
    }

    // Use for clean up before deleting
    release(){
        this.clusters.forEach((cluster)=>{
            cluster.release();
        });

        this._onRelase?.();

    }

    setActive(isActive: boolean, force: boolean = false){
        this.clusters.forEach((cluster)=>{
            cluster.setActive(isActive);
        })
        
        
        if(this.isActive === isActive && !force) return;
        this.isActive = isActive;
        this.redisplay(true);
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

function createCluster(data: ClusterData, map: MapOptions, radiusInPixels: number, useAverageLocation: boolean,
        reactElement: (count:number)=>React.ReactElement,parentCluster?: Cluster){
    const cluster =  new Cluster(
        map,
        radiusInPixels,
        useAverageLocation,
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

    private _useAverageLocation: boolean = true;


    private mainClusters: Cluster[] = [];
    private clustersByZoom: Record<number, Cluster[]> = {};

    private objects: MapObject[] = [];

    private _onZoomEnd = this._onZoomChange.bind(this);

    constructor(reactElement: (count:number)=>React.ReactElement, map: MapOptions, radiusInPixels: number = 200, averageLocation: boolean = false){
        super(map,"ClusterLayer");

        this.clusterReactElement = reactElement;
        this.radius = radiusInPixels;

        this._useAverageLocation = averageLocation;

        // This marker fix the bug. If all submarker is not active, this is. The layer stays active
        const justMarker = new Marker(30,30,()=>{
            return <></>
        }, map);

        super.add(justMarker)

        map.on("zoomend", this._onZoomEnd);
    }

    private _lastZoom = -1;
    private _onZoomChange(){
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

        markers.forEach((marker)=>{
            marker.setActive(false);
        });

        const clusters = this._splitToClusters(markers)

        this.mainClusters.forEach((cluster)=>{
            cluster.release();
        });
        
        this.mainClusters = clusters.map((data) => createCluster(data, this.map, this.radius, this._useAverageLocation, this.clusterReactElement))

        this.mainClusters.forEach((cluster)=>{
            const allSubclusters = [cluster, ...cluster.getAllSubclusters()]; // Including itself
            
            allSubclusters.forEach((subcluster)=>{
                for(let zoom = subcluster.startZoom; zoom <= subcluster.endZoom; zoom++){
                    if(!this.clustersByZoom[zoom]) this.clustersByZoom[zoom] = [];
                    this.clustersByZoom[zoom].push(subcluster);
                }
            })
        })

        this.mainClusters.forEach((cluster)=>{
            cluster.setActive(this.isActive)
            cluster.initialize();
        })

        this.mainClusters.forEach((cluster)=>{
            super.add(cluster.markerLayer);
        })
        


    }
    //#region SPLIT_TO_CLUSTERS functions

    private _splitToClusters(markers: MapObject[]) : ClusterData[]{
        


        const mainGroupsDict : GroupsDict = [];
        const mainGroups : Group[] = [];
        const min = this.map.getMinZoom();
        const max = this.map.getMaxZoom();

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
        


        const result = mainGroups.map((group)=>{
                return this._simplifyGroup(group);
            })
        

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
            cluster.setActive(isActive, true);
        })

    }

    initialize(): boolean {
        const r = super.initialize();

        this.mainClusters.forEach((cluster)=>{
            cluster.initializeObjects();
        })

        this._onZoomEnd()

        return r;
    }
    delete(): void {
        super.delete();
        this.mainClusters.forEach((cluster)=>{
            cluster.release();
        });
        this.map.off("zoomend", this._onZoomEnd);
    }


}