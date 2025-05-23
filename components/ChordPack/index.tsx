import * as d3 from 'd3';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import './style.css';
import { sum } from './utils';

interface PathData {
  path: string;
  chordName: string;
  circleName: string;
  chordIndex: number;
  circleIndex: number;
}

interface ChordPackChartProps {
  // 弧名称
  chordNames: string[];
  // 圆名称
  circleNames: string[];
  // 数据矩阵：dataMatrix[i][j] 表示第 i 个弧到第 j 个圆的数据
  dataMatrix: number[][];
  style?: React.CSSProperties;
}

const ChordPackChart = (props: ChordPackChartProps) => {
  const { chordNames, circleNames, dataMatrix, style } = props;

  // 计算每个弧的数据大小
  const chords = useMemo(
    () =>
      chordNames.map((name, rowIndex) => ({
        name,
        value: sum(dataMatrix[rowIndex]),
      })),
    [chordNames, dataMatrix],
  );

  // 计算每个圆的数据大小
  const circles = useMemo(
    () =>
      circleNames.map((name, colIndex) => ({
        name,
        value: sum(dataMatrix.map((item) => item[colIndex])),
      })),
    [circleNames, dataMatrix],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasRendered = useRef(false);

  // 提取配置参数
  const config = useMemo(
    () => ({
      padding: 60,
      arcThickness: 30,
      packPadding: 5,
    }),
    [],
  );

  // 处理基础数据
  const { chordData, circleData } = useMemo(
    () => ({
      chordData: chords.map((d, i) => ({
        value: d.value,
        name: d.name,
        rowIndex: i,
      })),
      circleData: circles.map((d, i) => ({
        value: d.value,
        name: d.name,
        colIndex: i,
      })),
    }),
    [chords, circles],
  );

  // 创建比例尺
  const createScales = useCallback(
    (width: number, height: number) => {
      const outerRadius = Math.min(width, height) * 0.5 - config.padding;
      const innerRadius = outerRadius - config.arcThickness;

      const chordLogScale = d3
        .scaleLog()
        .domain([
          d3.min(chordData, (d) => d.value) as number,
          d3.max(chordData, (d) => d.value) as number,
        ])
        .range([1, 100]);

      const circleLogScale = d3
        .scaleLog()
        .domain([
          d3.min(circleData, (d) => d.value) as number,
          d3.max(circleData, (d) => d.value) as number,
        ])
        .range([1, 100]);

      return { outerRadius, innerRadius, chordLogScale, circleLogScale };
    },
    [chordData, circleData, config],
  );

  // 处理点击事件
  const handleElementClick = useCallback(
    (
      selection: d3.Selection<any, any, any, any>,
      index: number,
      type: 'chord' | 'circle',
    ) => {
      if (selection.attr('class').includes('clicked')) {
        selection.classed('clicked', false);
        d3.selectAll('.blur').classed('blur', false);
        d3.selectAll('.focus').classed('focus', false);
        return;
      }

      d3.selectAll('.clicked').classed('clicked', false);
      selection.classed('clicked', true);

      d3.selectAll('.blur').classed('blur', false);
      d3.selectAll('.focus').classed('focus', false);

      d3.selectAll('.circle').classed('blur', true);
      d3.selectAll('.chord').classed('blur', true);
      d3.selectAll('.link').classed('blur', true);

      if (type === 'chord') {
        d3.selectAll(`.link-chord-${index}`)
          .classed('blur', false)
          .classed('focus', true);
        selection.classed('blur', false).classed('focus', true);

        dataMatrix[index]
          .map((c, i) => ({ c, i }))
          .filter((circle) => circle.c !== 0)
          .forEach(({ i }) => {
            d3.select(`.circle-${i}`)
              .classed('blur', false)
              .classed('focus', true);
          });
      } else {
        d3.selectAll(`.link-circle-${index}`)
          .classed('blur', false)
          .classed('focus', true);
        selection.classed('blur', false).classed('focus', true);

        dataMatrix
          .map((r, i) => ({ r, i }))
          .filter((row) => row.r[index] !== 0)
          .forEach(({ i }) => {
            d3.select(`.chord-${i}`)
              .classed('blur', false)
              .classed('focus', true);
          });
      }
    },
    [],
  );

  // 处理悬停事件
  const handleElementHover = useCallback(
    (
      selection: d3.Selection<any, any, any, any>,
      index: number,
      type: 'chord' | 'circle',
    ) => {
      if (selection.attr('class').includes('clicked')) return;

      d3.selectAll('.mouseout').classed('mouseout', false);
      d3.selectAll('.mouseover').classed('mouseover', false);

      selection.classed('mouseover', true);
      d3.selectAll(`.link-${type}-${index}`).classed('mouseover', true);

      if (type === 'chord') {
        dataMatrix[index]
          .map((c, i) => ({ c, i }))
          .filter((circle) => circle.c !== 0)
          .forEach(({ i }) => {
            d3.select(`.circle-${i}`).classed('mouseover', true);
          });
      } else {
        dataMatrix
          .map((r, i) => ({ r, i }))
          .filter((row) => row.r[index] !== 0)
          .forEach(({ i }) => {
            d3.select(`.chord-${i}`).classed('mouseover', true);
          });
      }

      d3.selectAll('.chord')
        .filter(':not(.focus)')
        .filter(':not(.clicked)')
        .filter(':not(.mouseover)')
        .classed('mouseout', true);

      d3.selectAll('.circle')
        .filter(':not(.focus)')
        .filter(':not(.clicked)')
        .filter(':not(.mouseover)')
        .classed('mouseout', true);
    },
    [],
  );

  const handleElementLeave = useCallback(() => {
    d3.selectAll('.mouseout').classed('mouseout', false);
    d3.selectAll('.mouseover').classed('mouseover', false);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || hasRendered.current) return;

    hasRendered.current = true;
    // 设置宽高
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 创建比例尺
    const { outerRadius, innerRadius, chordLogScale, circleLogScale } =
      createScales(width, height);

    // 创建布局
    const root = d3
      .hierarchy({
        name: 'root',
        value: 0,
        children: circleData.map((item) => ({
          ...item,
          value: circleLogScale(item.value),
        })),
      })
      .sum((d) => d.value);

    // 创建布局
    const pack = d3
      .pack<{
        name: string;
        value: number;
        children: { name: string; value: number; colIndex: number }[];
      }>()
      .size([width / 2 - 20, height / 2 - 20])
      .padding(config.packPadding);

    // 创建布局数据
    const packData = pack(root);

    // 过滤布局数据
    const finnalPackData = packData
      .descendants()
      .slice(1)
      .filter((item) => item.data.value > 0);

    // 创建弧形
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    // 创建饼图
    const pie = d3
      .pie<any, { value: number; name: string }>()
      .padAngle(2 / outerRadius)
      .sort(null)
      .value((d) => chordLogScale(d?.value));

    // 创建svg
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    // 创建弧形数据
    const arcData = pie(chordData);

    // 渲染弧形
    const chordGroup = svg
      .append('g')
      .style('z-index', 1)
      .attr('class', 'arcContainer');

    // 渲染弧形
    chordGroup
      .selectAll('path.chord')
      .data(arcData)
      .enter()
      .append('path')
      .classed('chord', true)
      .attr(
        'd',
        (d) =>
          arc({
            startAngle: d.startAngle,
            endAngle: d.endAngle,
            innerRadius,
            outerRadius,
          }) || '',
      )
      .each(function (d, i) {
        const selection = d3.select(this);
        selection.classed(`chord-${i}`, true);

        // 创建文本路径
        const path = selection.attr('d');
        const firstArcSection = /(^.+?)L/.exec(path)?.[1];

        if (firstArcSection) {
          const newArc = firstArcSection.replace(/,/g, ' ');
          chordGroup
            .append('path')
            .attr('class', 'textArc')
            .attr('id', `textArc-${i}`)
            .attr('d', newArc)
            .style('fill', 'none');
        }
      })
      .on('click', function (e, d) {
        const chordIndex = chordData.findIndex((c) => c.name === d.data.name);
        handleElementClick(d3.select(this), chordIndex, 'chord');
      })
      .on('mouseover', function (e, d) {
        const chordIndex = chordData.findIndex((c) => c.name === d.data.name);
        handleElementHover(d3.select(this), chordIndex, 'chord');
      })
      .on('mouseout', handleElementLeave);

    // 渲染文本标签
    chordGroup
      .selectAll('text')
      .data(chordData)
      .enter()
      .append('text')
      .attr('dy', -13)
      .attr('font-size', '1em')
      .attr('class', 'chordText')
      .append('textPath')
      .style('text-anchor', 'middle')
      .attr('startOffset', '50%')
      .attr('xlink:href', (_, i) => `#textArc-${i}`)
      .each(function (_, i) {
        d3.select(this).attr('id', `chord-text-${i}`);
      })
      .text((d) => d?.name)
      .each(function (_, i) {
        const arcLength = (
          svg.select(`#textArc-${i}`).node() as SVGPathElement
        )?.getTotalLength();
        if (this.textLength.baseVal.value > (arcLength || 0)) {
          this.setAttribute('fill', 'none');
        }
      });

    // 渲染圆形
    const circleGroup = svg.append('g').style('z-index', 4);

    // 渲染圆形
    circleGroup
      .selectAll('circle')
      .data(finnalPackData)
      .enter()
      .append('circle')
      .attr('cx', (d) => d.x - width / 4)
      .attr('cy', (d) => d.y - height / 4)
      .attr('r', (d) => d.r)
      .classed('circle', true)
      .attr('stroke', 'black')
      .attr('opacity', '0.6')
      .each(function (_, i) {
        d3.select(this).classed(`circle-${i}`, true);
      })
      .on('click', function (_, d) {
        const circleIndex = circleData.findIndex((c) => c.name === d.data.name);
        handleElementClick(d3.select(this), circleIndex, 'circle');
      })
      .on('mouseover', function (_, d) {
        const circleIndex = circleData.findIndex((c) => c.name === d.data.name);
        handleElementHover(d3.select(this), circleIndex, 'circle');
      })
      .on('mouseout', handleElementLeave);

    // 渲染圆形文本
    circleGroup
      .selectAll('text')
      .data(finnalPackData)
      .enter()
      .append('text')
      .attr('x', (d) => d.x - width / 4)
      .attr('y', (d) => d.y - height / 4)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text((d) => d.data?.name)
      .style('font-size', '12px')
      .each(function (_, i) {
        if (this.textLength.baseVal.value > finnalPackData[i].r * 2) {
          d3.select(this).attr('fill', 'none');
        }
      })
      .style('pointer-events', 'none');

    // 创建连接路径
    const paths: PathData[] = [];
    arcData.forEach((arc) => {
      const { data, startAngle, endAngle } = arc;
      const value =
        chords.find((item) => item.name === arc.data.name)?.value || 0;
      const chordIndex = chordData.findIndex((c) => c.name === data.name);

      if (chordIndex === -1) return;

      let arcOffset = startAngle;
      const rowData = dataMatrix[chordIndex];

      rowData
        .map((item, i) => ({
          value: item,
          circleIndex: i,
          name: circleData[i].name,
        }))
        .sort((a, b) => b.value - a.value)
        .forEach((item) => {
          const nameArcStartAngle = arcOffset;
          const nameArcEndAngle =
            arcOffset + (item.value / value) * (endAngle - startAngle);
          arcOffset = nameArcEndAngle;

          const packCircle = finnalPackData.find(
            (circle) => circle.data.name === item.name,
          );
          if (!packCircle) return;

          const nameArc = d3
            .arc()
            .innerRadius(innerRadius)
            .startAngle(nameArcStartAngle)
            .endAngle(nameArcEndAngle)({
            startAngle: nameArcStartAngle,
            endAngle: nameArcEndAngle,
            innerRadius: innerRadius - 1,
            outerRadius: innerRadius,
          });

          if (!nameArc) return;

          const finnalNameArc = nameArc.split('A').slice(0, 2).join('A');
          if (finnalNameArc.includes('NaN')) return;

          const startPoint = {
            x: innerRadius * Math.cos(nameArcStartAngle - Math.PI / 2),
            y: innerRadius * Math.sin(nameArcStartAngle - Math.PI / 2),
          };

          const endPoint = {
            x: innerRadius * Math.cos(nameArcEndAngle - Math.PI / 2),
            y: innerRadius * Math.sin(nameArcEndAngle - Math.PI / 2),
          };

          const centerPos = {
            x: packCircle.x - width / 4,
            y: packCircle.y - height / 4,
          };

          const controlPoint1 = {
            x: endPoint.x / 3,
            y: endPoint.y / 3,
          };

          const controlPoint2 = {
            x: startPoint.x / 3,
            y: startPoint.y / 3,
          };

          paths.push({
            path: `${finnalNameArc}
              Q${controlPoint1.x},${controlPoint1.y},${centerPos.x},${centerPos.y}
              Q${controlPoint2.x},${controlPoint2.y},${startPoint.x},${startPoint.y}`,
            chordName: data.name,
            circleName: item.name,
            chordIndex,
            circleIndex: item.circleIndex,
          });
        });
    });

    // 渲染连接
    svg
      .append('g')
      .lower()
      .attr('class', 'arcArea')
      .selectAll('path')
      .data(paths)
      .enter()
      .append('path')
      .attr(
        'class',
        (d) => `link link-chord-${d.chordIndex} link-circle-${d.circleIndex}`,
      )
      .attr('d', (d) => d.path)
      .on('mouseover', function (_, d) {
        if (!d3.select(this).attr('class').includes('clicked')) {
          d3.select(this).classed('mouseover', true);
          d3.select(`.chord-${d.chordIndex}`).classed('mouseover', true);
          d3.select(`.circle-${d.circleIndex}`).classed('mouseover', true);

          d3.selectAll('.chord')
            .filter(':not(.focus)')
            .filter(':not(.clicked)')
            .filter(':not(.mouseover)')
            .classed('mouseout', true);

          d3.selectAll('.circle')
            .filter(':not(.focus)')
            .filter(':not(.clicked)')
            .filter(':not(.mouseover)')
            .classed('mouseout', true);
        }
      })
      .on('click', function (_, d) {
        const selection = d3.select(this);
        if (selection.attr('class').includes('clicked')) {
          selection.classed('clicked', false);
          d3.selectAll('.blur').classed('blur', false);
          d3.selectAll('.focus').classed('focus', false);
        } else {
          d3.selectAll('.clicked').classed('clicked', false);
          selection.classed('clicked', true);

          d3.selectAll('.blur').classed('blur', false);
          d3.selectAll('.focus').classed('focus', false);

          d3.selectAll('.circle').classed('blur', true);
          d3.selectAll('.chord').classed('blur', true);
          d3.selectAll('.link').classed('blur', true);

          selection.classed('focus', true).classed('blur', false);
          d3.select(`.chord-${d.chordIndex}`)
            .classed('focus', true)
            .classed('blur', false);
          d3.select(`.circle-${d.circleIndex}`)
            .classed('focus', true)
            .classed('blur', false);
        }
      })
      .on('mouseout', handleElementLeave);
  }, [
    config,
    createScales,
    handleElementClick,
    handleElementHover,
    handleElementLeave,
  ]);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
      ref={containerRef}
    >
      <svg ref={svgRef} />
    </div>
  );
};

export default ChordPackChart;
