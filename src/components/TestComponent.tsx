import React, { useEffect, useState } from 'react'
import Marker from '../lib/core/Marker';

export default function TestComponent({map, marker, maxZoom}: {map: L.Map, marker: Marker, maxZoom: number}){
    const [text, setText] = useState("First");
    useEffect(()=>{
      map.on("zoom", ()=>{
        setText(map.getZoom()+"");
      })
    },[])
  
    // event type is MouseEvent
    const onClick : React.MouseEventHandler<HTMLButtonElement> = (e) => {
      e.stopPropagation();
      map.flyTo(marker.location, maxZoom)
    }
    return <div style={{
      backgroundColor: "white",
      position: "absolute"
  
    }}>
      {text}
      <button onClick={onClick}>Focus</button>
    </div>
  }