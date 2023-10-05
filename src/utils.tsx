import { LocationPoint } from "./lib/core/LocationPoint";

export function getRandomPosition() : LocationPoint{
    const min = [50.022037214814084, 14.289502003176219];
    const max = [50.012637040409494, 14.304438263084045];
    
    const latitude = Math.random() * (max[0] - min[0]) + min[0];
    const longitude = Math.random() * (max[1] - min[1]) + min[1];
    
    return [latitude, longitude ];
  }


export function measureTime<T>(callback: ()=>T, name: string = "Function", print: boolean = false){
  const start = performance.now();

  const result = callback();

  const end = performance.now();
  const time =  end - start;

  if(print) console.log(`${name} took ${time}ms`);

  return result;
}