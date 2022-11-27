import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as p5 from 'p5';
import { GameModule } from './sketch/game.module';
import {
  JsonBoard,
  JsonInit,
  JsonLog,
  JsonPlanetInit,
  JsonPlayer,
  JsonTick,
} from './sketch/interfaces';

@Component({
  selector: 'lib-nanowar-visualizer',
  templateUrl: './nanowar-visualizer.component.html',
  styleUrls: ['./nanowar-visualizer.component.css'],
})
export class NanowarVisualizerComponent implements OnChanges {
  @Input() public jsonstring!: string;

  public time: number = 0;
  public last: number = 0;
  public isAnimating: boolean = false;
  public fps: number = 3;

  private instance?: p5;
  private last_time: number = 0;
  private accFrameTime: number = 0;

  private sketch(ctx: p5): void {
    let game: GameModule;
    let updates: JsonTick[];
    let scale: number;

    ctx.setup = () => {
      const jsonObj: JsonLog = JSON.parse(this.jsonstring);
      const { init, ticks }: { init: JsonInit; ticks: JsonTick[] } = jsonObj;
      const {
        board,
        planets,
        players,
      }: { board: JsonBoard; planets: JsonPlanetInit[]; players: JsonPlayer[] } = init;
      const { width, height }: { width: number; height: number } = board;

      const clientHeight = document.querySelector<HTMLDivElement>('#container')!.clientHeight;
      const clientWidth = document.querySelector<HTMLDivElement>('#canvas')!.clientWidth;
      const wratio = clientWidth / width;
      const hratio = clientHeight / height;
      const min_ratio = Math.min(wratio, hratio);

      let C = ctx.createCanvas(width * min_ratio, height * min_ratio);
      C.parent('canvas');

      scale = min_ratio;
      ctx.scale(min_ratio);
      ctx.noLoop();

      updates = ticks;
      this.last = updates.length - 1;

      game = new GameModule(planets, players);
      ctx.textAlign(ctx.CENTER, ctx.CENTER);
    };

    ctx.draw = () => {
      if (this.isAnimating) {
        const currentTime = window.performance.now();
        const deltaTime = window.performance.now() - this.last_time;
        this.last_time = currentTime;

        this.accFrameTime += deltaTime / 1000;

        const d = Math.floor(this.accFrameTime * this.fps);
        this.accFrameTime = this.accFrameTime - (d * 1) / this.fps;
        this.time = Math.min(this.time + d, this.last);
      }

      if (this.time <= this.last && this.time >= 0) {
        ctx.scale(scale);
        ctx.background(51);
        game.update(updates[this.time]);
        game.render(ctx, this.isAnimating ? this.accFrameTime * this.fps : 1);
        game.troops = [];
        document.querySelector('#tick-label')!.innerHTML = `Tick: ${this.time}`;
      }

      if (this.time == this.last && this.isAnimating) {
        this.isAnimating = false;
      }
    };
  }

  nextButtonClickedEvent(): void {
    if (this.time < this.last) this.time++;
    this.instance?.redraw();
  }

  prevButtonClickedEvent(): void {
    if (this.time > 0) this.time--;
    this.instance?.redraw();
  }

  animateStartButtonClickedEvent(): void {
    this.isAnimating = true;
    this.accFrameTime = 0;
    this.last_time = window.performance.now();
    this.instance?.loop();
  }

  animateEndButtonClickedEvent(): void {
    this.isAnimating = false;
    this.instance?.noLoop();
  }

  fpsInputEvent(event: any): void {
    this.fps = parseFloat(event?.target?.value) ?? 1;
    console.log(this.fps);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.jsonstring) {
      this.instance = new p5(this.sketch.bind(this));
    }
  }
}
