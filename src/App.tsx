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
import { count } from 'console';
import { GeometryType } from './lib/core/Geometry';



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

  const [zoom, setZoom] = useState(0);


  

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

    map.map?.on("zoomend", ()=>{
      setZoom(map.map?.getZoom() || 0)
    })
    setZoom(map.map?.getZoom() || 0)

    setLayers([])

    const layer1 = map.createClusterLayer((count)=>{
      return <div style={{backgroundColor:"white"}}>
          <h1>Count: {count}</h1>
      </div>
    });

    const geom = map.createGeometry([[
      [50.02307171162239, 14.290628725435235],
      [50.009255314878274, 14.292171043377705],
      [50.01660123561199, 14.297886692223328],
      [50.015901672493776, 14.304509586917458],
      [50.02114814761987, 14.302876544390136]
    ]], "polygon")

    // const layer1 = map.createLayer()
    add(layer1)

    // const COUNT = 4;
    // for(let i = 0; i < COUNT; i++){
      // const location = getRandomPosition();
    //   const marker = map.createMarker(location[0], location[1], ()=>{
    //     return <Krecek/>
    //   })
    //   marker?.addToLayer(layer1)
    // }

    const count = 20; // 55 minimum // 100 optimum
    const markers : Marker[] = [];
    for(let x=0; x<count; x++){
      for(let y=0; y<count; y++){
        const min = [50.022037214814084, 14.289502003176219];
        const max = [50.012637040409494, 14.304438263084045];

        const latitude = min[0] + (max[0] - min[0]) / count * x;
        const longitude = min[1] + (max[1] - min[1]) / count * y;

        const marker = map.createMarker(latitude, longitude, ()=>{
          return <Krecek/>
        } )

        markers.push(marker as Marker);
      }
    }

    layer1?.add(markers)

    const gm = map.createGeometry([[[50.022037214814084, 14.289502003176219],[50.012637040409494, 14.304438263084045]]],
      "line"
    )



  },[map.initialized])

  return (
    <div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0}}>
      <map.container style={{flex:1}} > 
        <div style={{margin: 10, padding: 5, backgroundColor: "whitesmoke", width: 120}}>
          ahoj
          Aktualní zoom: {zoom}
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
