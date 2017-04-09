import {Component, OnInit, OnChanges, ViewChild, ElementRef, Input, ViewEncapsulation} from '@angular/core';
import * as d3 from 'd3';

import * as Kinetic from 'Kinetic';
import {Timeline} from "../../models/taskDetail/timeline";

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TimelineComponent implements OnInit, OnChanges {
  @ViewChild('timeline') private chartContainer: ElementRef;
  @Input() private data: Timeline;
  private margin: any = {top: 20, bottom: 20, left: 20, right: 20};
  private chart: any;
  private width: number;
  private height: number;
  private bandMargin: any = 20;

  private sideMargin: any = 40;
  private bottomMargin: any = 30;
  private topMargin: any = this.bottomMargin;


  private xScale: any;
  private yScale: any;
  private colors: any;
  private xAxis: any;
  private yAxis: any;

  private stage: any;

  private endOfTimeline: any;
  private secondsPerUnit: any;

  private bandsById: Array<any> = [];
  private eventsById: Array<any> = [];


  constructor() {
  }

  ngOnInit() {
    if (this.data) {
      this.drawTimeline(this.data);
      //this.updateChart();
    }
  }

  drawTimeline(timelineData) {
    let element = this.chartContainer.nativeElement;
    this.width = element.offsetWidth;
    this.height = element.offsetHeight;
    this.endOfTimeline = this.getEndOfTimeline(timelineData);
    this.secondsPerUnit = this.getSecondsPerUnit(timelineData);

    console.log('width =' + this.width);
    console.log('height = ' + this.height);

    console.log('timeline = ' + this.data.events);

    this.stage = new Kinetic.Stage({container: 'timeline', width: this.width, height: this.height});
    this.drawUngroupedTimebands(this.stage, this.data, this.secondsPerUnit);
    this.drawMainTimeline(this.stage, this.formatShort(0), this.formatShort(this.endOfTimeline));

  }

  getEndOfTimeline(timelineData) {
    return timelineData.relativePositionInSeconds + timelineData.durationInSeconds;
  }

  getSecondsPerUnit(timelineData) {
  return (this.getEndOfTimeline(timelineData) / (this.width - (2 * this.sideMargin)));
}

  formatShort(duration) {
    let d = Number(duration);
    let h = Math.floor(d / 3600);
    let m = Math.floor(d % 3600 / 60);
    return ( h + ":" + (m < 10 ? "0" : "") + m);
  }

  drawMainTimeline(stage, startTick, endTick) {
    let layer = new Kinetic.Layer();
    let tickHeight = 10;
    let tickMargin = 5;
    let startTickLabel = new Kinetic.Text({
      x: this.sideMargin - tickMargin,
      y: this.height - this.bottomMargin,
      text: startTick,
      fontSize: 13,
      align: 'right',
      fontFamily: 'Calibri',
      fill: 'black'
    });
    startTickLabel.setOffset({x: startTickLabel.getWidth()});

    let endTickLabel = new Kinetic.Text({
      x: this.width - this.sideMargin + tickMargin,
      y: this.height - this.bottomMargin,
      text: endTick,
      fontSize: 13,
      fontFamily: 'Calibri',
      fill: 'black'
    });

    let line = new Kinetic.Line({
      points: [
        this.sideMargin, this.height - this.bottomMargin + tickHeight,
        this.sideMargin, this.height - this.bottomMargin,
        this.width - this.sideMargin, this.height - this.bottomMargin,
        this.width - this.sideMargin, this.height - this.bottomMargin + tickHeight
      ],
      stroke: 'black',
      strokeWidth: 3,
      lineCap: 'square',
      lineJoin: 'round',
      tension: 0,
    });

    layer.add(line);
    layer.add(startTickLabel);
    layer.add(endTickLabel);
    stage.add(layer);

  }



  drawUngroupedTimebands(stage, timelineData, secondsPerUnit) {
    console.log('drawUngroupedTimebands');

    let that = this;

    timelineData.ideaFlowBands.forEach(function (band) {
      console.log('each');
      if (band.type != "PROGRESS") {
        let groupLayer = new Kinetic.Layer();
        let bandGroup = that.drawBandGroup(groupLayer, band, secondsPerUnit);
        bandGroup.layer.on('mouseover touchstart', function () {
          that.highlightBandGroup(bandGroup)
        });
        bandGroup.layer.on('mouseout touchend', function () {
          that.restoreBandGroup(bandGroup)
        });
        stage.add(groupLayer);
      }
    });
  }

  drawBandGroup(groupLayer, band, secondsPerUnit) {
    console.log('drawBandGroup');
    let bandGroup = this.createBandGroup(groupLayer, band, secondsPerUnit);
    this.bandsById[bandGroup.id] = bandGroup;  //TODO

    return bandGroup;
  }

  createBandGroup(groupLayer, band, secondsPerUnit) {
    console.log('createBandGroup');
    let groupInfo = {id: band.id, bandInfos: [], layer: groupLayer};

    let colorBand = this.drawBand(groupLayer, band, secondsPerUnit);
    let bandInfo = {data: band, rect: colorBand};

    groupInfo.bandInfos.push(bandInfo);

    return groupInfo;
  }

  drawBand(layer, band, secondsPerUnit) {
    console.log('drawBand');
    var offset = Math.round(band.relativePositionInSeconds / secondsPerUnit) + this.sideMargin;
    var size = Math.round(band.durationInSeconds / secondsPerUnit);

    var colorBand = new Kinetic.Rect({
      x: offset,
      y: this.topMargin + this.bandMargin,
      width: size,
      height: this.height - this.bottomMargin - this.topMargin - this.bandMargin,
      fill: this.lookupBandColors(band.type)[0],
      stroke: this.lookupBandColors(band.type)[1],
      strokeWidth: 1
    });

    layer.add(colorBand);
    return colorBand;
  }

  highlightBandGroup(groupInfo) {
    let that = this;
    groupInfo.bandInfos.forEach(function (bandInfo) {
      bandInfo.rect.setFill(that.lookupBandColors(bandInfo.data.type)[1])
    });
    groupInfo.layer.draw();

  }

  restoreBandGroup(groupInfo) {
    let that = this;
    groupInfo.bandInfos.forEach(function (bandInfo) {
      bandInfo.rect.setFill(that.lookupBandColors(bandInfo.data.type)[0])
    });
    groupInfo.layer.draw();
  }

  lookupBandColors(bandType) {
    if (bandType == 'TROUBLESHOOTING') {
      return ['#ff0078', '#FF90D1', '#FFDEF6']
    } else if (bandType == 'LEARNING') {
      return ['#520ce8', '#9694E8', '#EDE2FD']
    } else if (bandType == 'REWORK') {
      return ['#ffcb01', '#FFEA7C', '#FFF5A7']
    } else {
      throw "Unable to find color for bandType: " + bandType
    }
  }


  drawBandOld() {
    let layer = new Kinetic.Layer();

    var colorBand = new Kinetic.Rect({
      x: 3,
      y: 3,
      width: 100,
      height: 100,
      fill: '#ff0078',
      stroke: '#ff0078',
      strokeWidth: 1
    });

    layer.add(colorBand);
    this.stage.add(layer);
    this.stage.draw();
  }

  ngOnChanges() {
    if (this.chart) {
      //this.updateChart();
    }
  }

  // createChart() {
  //   let element = this.chartContainer.nativeElement;
  //   this.width = element.offsetWidth - this.margin.left - this.margin.right;
  //   this.height = element.offsetHeight - this.margin.top - this.margin.bottom;
  //   let svg = d3.select(element).append('svg')
  //     .attr('width', element.offsetWidth)
  //     .attr('height', element.offsetHeight);
  //
  //   // chart plot area
  //   this.chart = svg.append('g')
  //     .attr('class', 'bars')
  //     .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  //
  //   // define X & Y domains
  //   let xDomain = this.data.map(d => d[0]);
  //   let yDomain = [0, d3.max(this.data, d => d[1])];
  //
  //   // create scales
  //   this.xScale = d3.scaleBand().padding(0.1).domain(xDomain).rangeRound([0, this.width]);
  //   this.yScale = d3.scaleLinear().domain(yDomain).range([this.height, 0]);
  //
  //   // bar colors
  //   this.colors = d3.scaleLinear().domain([0, this.data.length]).range(<any[]>['red', 'blue']);
  //
  //   // x & y axis
  //   this.xAxis = svg.append('g')
  //     .attr('class', 'axis axis-x')
  //     .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this.height})`)
  //     .call(d3.axisBottom(this.xScale));
  //   this.yAxis = svg.append('g')
  //     .attr('class', 'axis axis-y')
  //     .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
  //     .call(d3.axisLeft(this.yScale));
  // }
  //
  // updateChart() {
  //   // update scales & axis
  //   this.xScale.domain(this.data.map(d => d[0]));
  //   this.yScale.domain([0, d3.max(this.data, d => d[1])]);
  //   this.colors.domain([0, this.data.length]);
  //   this.xAxis.transition().call(d3.axisBottom(this.xScale));
  //   this.yAxis.transition().call(d3.axisLeft(this.yScale));
  //
  //   let update = this.chart.selectAll('.bar')
  //     .data(this.data);
  //
  //   // remove exiting bars
  //   update.exit().remove();
  //
  //   // update existing bars
  //   this.chart.selectAll('.bar').transition()
  //     .attr('x', d => this.xScale(d[0]))
  //     .attr('y', d => this.yScale(d[1]))
  //     .attr('width', d => this.xScale.bandwidth())
  //     .attr('height', d => this.height - this.yScale(d[1]))
  //     .style('fill', (d, i) => this.colors(i));
  //
  //   // add new bars
  //   update
  //     .enter()
  //     .append('rect')
  //     .attr('class', 'bar')
  //     .attr('x', d => this.xScale(d[0]))
  //     .attr('y', d => this.yScale(0))
  //     .attr('width', this.xScale.bandwidth())
  //     .attr('height', 0)
  //     .style('fill', (d, i) => this.colors(i))
  //     .transition()
  //     .delay((d, i) => i * 10)
  //     .attr('y', d => this.yScale(d[1]))
  //     .attr('height', d => this.height - this.yScale(d[1]));
  // }
}