export interface GameContext {
    deltaTime: number;
    input: Set<string>;
    mouse: { 
        x: number;
        y: number; 
        dx: number; 
        dy: number
 };
}
