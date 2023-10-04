import React from "react";
import { LocationPoint } from "./LocationPoint";
import { MapOptions } from "./MapObject";
import GeometryMarker from "./GeometryMarker";

export type GeometryType = "polygon" | "line";

export default class Geometry extends GeometryMarker{

    constructor(points: LocationPoint[][], type: GeometryType, map: MapOptions){
        super(points, type, ()=><></>, map)
    }
}

export function createGeometry(points: LocationPoint[][], type: GeometryType, map: MapOptions){
    return new Geometry(points, type, map);
}