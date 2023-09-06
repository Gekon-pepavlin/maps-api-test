import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMap, { CustomProjection } from './lib/core/useMap';
import Marker from './lib/core/Marker';
import { LocationPoint } from './lib/core/LocationPoint';
import * as L from "leaflet"
import MarkerLayer from './lib/core/MarkerLayer';
import ClusterMarkerLayer from './lib/core/ClusterMarkerLayer';
import TestComponent from './components/TestComponent';
import Krecek from './components/Krecek';
import MapObject from './lib/core/MapObject';
import { getRandomPosition } from './utils/utils';
import Maja from './components/Maja';



const innerProjection : CustomProjection = {
  crs: new L.Proj.CRS('EPSG:5514', "+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=100 +y_0=10000 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs",{
    resolutions: [
      4891.96999883583,
      2445.98499994708,
      1222.99250010583,
      611.496250052917,
      305.748124894166,
      152.8740625,
      76.4370312632292,
      38.2185156316146,
      19.1092578131615,
      9.55462890525781,
      4.77731445262891,
      2.38865722657904,
      1.19432861315723,
      0.597164306578613,
      0.298582153289307,
      0.149291076644653,
      0.0746455383223265,
      0.0373227691611632
    ],
    origin: [-951499.37, -930499.37],
  }),
  transform: (location: LocationPoint) => {
    return [location[0]+0.00007, location[1] + 0.00009]
  }
  
};

function App() {
  const map = useMap(innerProjection);

  const [layers, setLayers] = useState<MapObject[]>([]);
  const [justNumber, setJustNumber] = useState(0);

  

  const rerender = (()=>{
    setJustNumber((n)=>n+1)
  })

  const add = (o?: MapObject) => {
    if(!o) return;
    setLayers((l)=>{
      return [...l, o]
    })

    o.addListener("activechange",rerender)
  }


  useEffect(()=>{
    if(!map.initialized) return;

    setLayers([])

    const layer1 = map.createClusterLayer((count)=>{
      return <Maja count={count}/>
    });
    add(layer1)

    const COUNT = 10;
    for(let i = 0; i < COUNT; i++){
      const location = getRandomPosition();
      const marker = map.createMarker(location[0], location[1], ()=>{
        return <Krecek/>
      })
      marker?.addToLayer(layer1)
    }

  },[map.initialized])

  return (
    <div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
      <map.container style={{flex:1}} > 
        <div style={{margin: 10, padding: 5, backgroundColor: "whitesmoke", width: 120}}>
          ahoj
          <br/>
          {layers.map((layer, i)=>{
            

            const onClick = () => {
              layer.setActive(!layer.isActive);
            }
            return <button key={layer.id} onClick={onClick}>{layer.isActive? "Vypnout" : "Zapnout"} vrstvu  {i+1}
              {" "}<strong>{layer.name}</strong>{""}
            </button>
          })}
        </div>
      </map.container>
    </div>
  );
}

export default App;
