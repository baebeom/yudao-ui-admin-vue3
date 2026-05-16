// src/types/g6.d.ts
declare module '@antv/g6' {
  export class Graph {
    constructor(options: any)
    data(data: any): void
    render(): void
    destroy(): void
    changeSize(width: number, height: number): void
  }
  
  const G6: {
    Graph: typeof Graph
  }
  
  export default G6
}