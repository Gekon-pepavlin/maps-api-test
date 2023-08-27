import React, { Children, Ref, cloneElement, useCallback } from 'react'
// import "./map.css"
import useMap from './useMap';

export interface MapProps{
    style?: React.CSSProperties,
    children?: React.ReactNode
}
export default function MapContainer(ref: any, onMountChange?: ()=>void) {
  let initialized = false;

  return (props: MapProps) => {
    return (

    <div style={{...props.style, overflow: "hidden", position: "absolute", left: 0, top: 0, right: 0, bottom: 0}} >
        <div style={{position: "relative", height: "100%"}}>

            {/*Div for map to render*/}
            <div ref={ref} style={{position: "absolute", left: 0, top: 0, right: 0, bottom:0, overflow: "hidden"}}></div>

            {/*Div for panels and other custom elements*/}
            <div style={{position: "absolute", left:0, top:0,right:0, bottom:0, pointerEvents: "none", zIndex: 500}}>
                {Children.map(props.children, (child : any, i)=>
                  cloneElement(
                    child,
                    { style: { ...child.props.style, pointerEvents: "auto"}}
                  )
                )}
            </div>

            <div ref={(node)=>{
              if(!node) return;

              if(initialized) return;
              initialized = true;
              
              onMountChange?.()
            }}/>

        </div>
    </div>
  )};
}
