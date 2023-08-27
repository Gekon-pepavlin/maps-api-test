import React, { useMemo } from 'react'
import Marker from './Marker';
import Geometry from './Geometry';
import MapObject, { MapOptions } from './MapObject';


export default class MarkerLayer extends MapObject{
    constructor(map: MapOptions){
        super(map, "Layer")

        this.setActive(true, true);
    }

    add(marker: MapObject){
        super.add(marker);
    }


}
