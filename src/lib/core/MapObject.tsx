import { v4 as uuid } from 'uuid';
import { LocationPoint } from './LocationPoint';

export type MapOptions = L.Map;


type EventName = "activechange" | "childrenchange" | "locationchange";
export default class MapObject{
    name: string;
    id: string;


    parent: MapObject | undefined;
    protected children: MapObject[] = [];
    protected location: LocationPoint;

    private useAverageLocation: boolean = true;

    map: MapOptions;

    isActive: boolean = true;
    isInitialized: boolean = false;


    private eventCallbacks: Record<string, ((e: any)=>void)[]> = {};


    get hasParent(){
        return this.parent !== undefined
    }
    
    private dontForgetTimeout;

    constructor(map: MapOptions, name: string = "MapObject"){
        this.name = name;
        this.id = uuid();

        // Attach map
        this.map = map;
        this.setMap(map);

        this.location = [0,0];


        this.dontForgetTimeout = setTimeout(()=>{
            if(!this.isInitialized) 
                console.warn("Don't forget to call initialize() on", this.name, "object.")
        }, 5000)
    }

    toString(){
        return this.name
    }

    getLocation(){
        return this.location;
    }

    setLocation(location: LocationPoint){
        if(this.location[0] === location[0] && this.location[1] === location[1]) return;
        
        this.location = location
        this.callEventCallback("locationchange", this.location);
        this.parent?.recalculateLocation();
    }

    protected setMap(map: L.Map){
        this.map = map;
    }
    protected add(child: MapObject | MapObject[]){
        if(child instanceof Array){
            child.forEach( (c)=>{
                this._add(c);
            })
        }else{
            this._add(child);
        }
    }
    private _add(child: MapObject){
        this.children.push(child);
        child._setParent(this);

        this.recalculateLocation()
        this.callEventCallback("childrenchange", this.children);

    }
    protected remove(child: MapObject){
        const index = this.children.indexOf(child);
        if(index>=0){
            this.children[index].parent = undefined
            // remove from array
            this.children.splice(index, 1);

        }else{
            console.log("Child not found.")
        }

        this.recalculateLocation()
        this.callEventCallback("childrenchange", this.children);

    }

    private recalculateLocation(){
        if(this.children.length==0) return;

        if(!this.useAverageLocation){
            const middleObject = this.children[Math.floor(this.children.length/2)];
            const location = middleObject.getLocation();
            this.setLocation(location);
            return;
        }

        let sum = {lat: 0, lng: 0};

        this.children.forEach( (child: MapObject)=>{
            const location = child.getLocation();
            sum.lat += location[0];
            sum.lng += location[1];
        }
        );
        sum.lat = sum.lat / this.children.length;
        sum.lng = sum.lng / this.children.length;

        const finalLocation = [sum.lat, sum.lng];

        if(this.location[0] === finalLocation[0] && this.location[1] === finalLocation[1]) return;

        this.setLocation([sum.lat, sum.lng]);
    }

    private _setParent(parent?: MapObject){
        if(!parent){
            console.log("Parent is undefined");
            return;
        }

        else if(this.parent === parent){
            return;
        }
        
        else if(this.hasParent){
            this.parent?.remove(this)
        }

        this.parent = parent;
        this.parent.setMap(this.map);
    }
    protected setParent(parent?: MapObject){
        this._setParent(parent);

        if(!this.parent){
            console.log("Parent is undefined");
            return;
        }

        this.parent.add(this);
    }

    addListener(event: EventName | any, callback: (e: any)=>void, callOnAdd: boolean = false){
        if(!this.eventCallbacks[event]) this.eventCallbacks[event] = [];
        this.eventCallbacks[event].push(callback);

        if(callOnAdd) this.callEventCallback(event, null);
    }

    protected callEventCallback(event: EventName | any, e: any){
        if(!this.eventCallbacks[event]) return;
        this.eventCallbacks[event].forEach( (callback)=>{
            callback(e);
        })
    }



    setActive(isActive: boolean, force: boolean = false, ignoreChildren = false) : any{
        if(!this.map){
            console.log("Cannot change active property because map is not attached");
            return;
        };
        if(!force && isActive === this.isActive) return;
        this.isActive = isActive;

        if(!ignoreChildren){
            this.children.forEach( (child)=>{
                child.setActive(isActive, force);
            });
        }

        if(this.hasParent) this.parent?.onChildrenActiveChange();

        this.callEventCallback("activechange", this.isActive);
        return true;
    }

    removeListener(event: EventName | any, callback: (e: any)=>void){
        if(!this.eventCallbacks[event]) return;

        const index = this.eventCallbacks[event].indexOf(callback);
        if(index>=0){
            this.eventCallbacks[event].splice(index, 1);
        }
    }


    
    protected onChildrenActiveChange(){
        let allSame = true;
        let first = true;
        let lastIsActive : boolean = true;

        for(let i=0; i<this.children.length; i++){
            const l = this.children[i];


            if(!first && lastIsActive != l.isActive) allSame = false;

            first = false;
            lastIsActive = l.isActive;
        }

        if(!first && allSame) this.setActive(lastIsActive)
        
    }

    initialize(){
        const inMap = this.isInitialized;

        this.children.forEach( (child)=>{
            child.initialize();
        });

        clearTimeout(this.dontForgetTimeout);

        this.isInitialized = true;
        return inMap !== this.isInitialized;
    }
    delete(){
        if(this.hasParent) this.parent?.remove(this);
        this.children.forEach( (child)=>{
            child.delete();
        })
        this.isInitialized = false;
    }

    setUseAverageLocation(useAverageLocation: boolean){
        this.useAverageLocation = useAverageLocation;
        this.recalculateLocation();
    }
}