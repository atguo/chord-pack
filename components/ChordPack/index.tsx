import * as d3 from 'd3';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import './style.css';
import { angleBetween, sum } from './utils';
import type { BaseType } from 'd3';
export { generateData } from './utils';

const defaultConfig = {
  padding: 50,
  arcThickness: 30,
  packPadding: 10,
};

interface DataItem {
  value: number;
  name: string;
}

interface PathData {
  path: string;
  chordName: string;
  circleName: string;
  chordIndex: number;
  circleIndex: number;
}

type ItemInfo =
  | { type: 'chord' | 'circle'; data: DataItem }
  | { type: 'link'; data: Omit<PathData, 'path'> };

interface ChordPackChartProps {
  // 弧名称
  chordNames: string[];
  // 圆名称
  circleNames: string[];
  // 数据矩阵：dataMatrix[i][j] 表示第 i 个弧到第 j 个圆的数据
  dataMatrix: number[][];
  style?: React.CSSProperties;
  onItemSelect?: (info: ItemInfo) => void;
  onItemUnSelect?: (info: ItemInfo) => void;
}

export const ChordPackChart = (props: ChordPackChartProps) => {
  const {
    chordNames,
    circleNames,
    dataMatrix,
    style,
    onItemSelect,
    onItemUnSelect,
  } = props;

  const prevClicked = useRef<{ chords: number[]; circles: number[] }>({
    chords: [],
    circles: [],
  });

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
      const outerRadius = Math.min(width, height) * 0.5 - defaultConfig.padding;
      const innerRadius = outerRadius - defaultConfig.arcThickness;

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
    [chordData, circleData],
  );

  // 处理文本
  const emphasizeText = useCallback(
    (type: 'chord' | 'circle', index: number) => {
      const selection = d3.select(`#${type}-text-${index}`);
      selection.attr('fill', 'black');
    },
    [],
  );

  const cancleEmphasizeText = useCallback(
    (type: 'chord' | 'circle', index: number) => {
      const selection = d3.select(`#${type}-text-${index}`);
      selection.attr('fill', 'none');
    },
    [],
  );

  // 处理点击事件
  const handleElementClick = useCallback(
    <GElement extends BaseType>(
      selection: d3.Selection<
        GElement,
        { value: number; name: string },
        null,
        undefined
      >,
      index: number,
      type: 'chord' | 'circle',
    ) => {
      // 取消之前的选中节点
      for (const i of prevClicked.current.chords) {
        cancleEmphasizeText('chord', i);
        onItemUnSelect?.({
          type: 'chord',
          data: chords[i],
        });
      }
      for (const i of prevClicked.current.circles) {
        cancleEmphasizeText('circle', i);
        onItemUnSelect?.({
          type: 'circle',
          data: circles[i],
        });
      }
      // 如果当前节点已经选中，则取消选中并直接返回
      if (selection.attr('class').includes('clicked')) {
        selection.classed('clicked', false);
        d3.selectAll('.blur').classed('blur', false);
        d3.selectAll('.focus').classed('focus', false);
        return;
      }

      // 取消之前的选中状态
      d3.selectAll('.clicked').classed('clicked', false);
      d3.selectAll('.blur').classed('blur', false);
      d3.selectAll('.focus').classed('focus', false);

      // 当前节点标记为选中状态
      selection.classed('clicked', true);

      // 记录选中节点
      prevClicked.current[type === 'chord' ? 'chords' : 'circles'] = [index];

      // 触发选中事件
      onItemSelect?.({ type, data: type === 'chord' ? chords[index] : circles[index] });

      // 设置所有节点为模糊状态
      d3.selectAll('.circle').classed('blur', true);
      d3.selectAll('.chord').classed('blur', true);
      d3.selectAll('.link').classed('blur', true);
      // 高亮当前节点
      emphasizeText(type, index);
      selection.classed('blur', false).classed('focus', true);
      // 如果当前节点是圆，则高亮对应的弧
      d3.selectAll(`.link-${type}-${index}`)
        .classed('blur', false)
        .classed('focus', true);

      let linkedNodes: { index: number }[] = [];
      const linkedType = type === 'chord' ? 'circle' : 'chord';
      // 找到当前节点的链接节点
      if (type === 'chord') {
        // 获取当前弧对应的圆
        linkedNodes = dataMatrix[index]
          .map((c, i) => ({ c, index: i }))
          .filter((circle) => circle.c !== 0);
      } else {
        // 获取当前圆对应的弧
        linkedNodes = dataMatrix
          .map((r, i) => ({ r, index: i }))
          .filter((row) => row.r[index] !== 0);
      }
      // 记录链接节点
      prevClicked.current[`${linkedType}s`] = linkedNodes.map(
        ({ index }) => index,
      );
      // 高亮链接节点
      for (const { index } of linkedNodes) {
        // 显示弧的文本
        emphasizeText(linkedType, index);
        // 触发选中事件
        onItemSelect?.({
          type: linkedType,
          data: linkedType === 'chord' ? chords[index] : circles[index],
        });
        // 高亮弧
        d3.select(`.${linkedType}-${index}`)
          .classed('blur', false)
          .classed('focus', true);
      }
    },
    [
      dataMatrix,
      chords,
      circles,
      onItemSelect,
      onItemUnSelect,
      cancleEmphasizeText,
      emphasizeText,
    ],
  );

  // 处理悬停事件
  const handleElementHover = useCallback(
    <GElement extends BaseType>(
      selection: d3.Selection<
        GElement,
        { value: number; name: string },
        null,
        undefined
      >,
      index: number,
      type: 'chord' | 'circle',
    ) => {
      if (selection.attr('class').includes('clicked')) return;

      emphasizeText(type, index);

      d3.selectAll('.mouseout').classed('mouseout', false);
      d3.selectAll('.mouseover').classed('mouseover', false);

      selection.classed('mouseover', true);
      d3.selectAll(`.link-${type}-${index}`).classed('mouseover', true);

      const linkedType = type === 'chord' ? 'circle' : 'chord';
      let linkedNodes: { index: number }[] = [];

      if (type === 'chord') {
        linkedNodes = dataMatrix[index]
          .map((c, i) => ({ c, index: i }))
          .filter((circle) => circle.c !== 0);
      } else {
        linkedNodes = dataMatrix
          .map((r, i) => ({ r, index: i }))
          .filter((row) => row.r[index] !== 0);
      }

      for (const { index } of linkedNodes) {
        emphasizeText(linkedType, index);
        d3.select(`.${linkedType}-${index}`).classed('mouseover', true);
      }

      // 设置其他节点为模糊状态
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
    [dataMatrix, emphasizeText],
  );

  const handleElementLeave = useCallback(
    <GElement extends BaseType>(
      selection: d3.Selection<
        GElement,
        { value: number; name: string },
        null,
        undefined
      >,
      index: number,
      type: 'chord' | 'circle',
    ) => {
      d3.selectAll('.mouseout').classed('mouseout', false);
      d3.selectAll('.mouseover').classed('mouseover', false);

      const selectionClass = selection.attr('class');

      if (
        selectionClass.includes('clicked') ||
        selectionClass.includes('focus')
      )
        return;

      cancleEmphasizeText(type, index);
      if (type === 'chord') {
        for (const { c, i } of dataMatrix[index]
          .map((c, i) => ({ c, i }))
          .filter((circle) => circle.c !== 0)) {
          cancleEmphasizeText('circle', i);
        }
      } else {
        for (const { r, i } of dataMatrix
          .map((r, i) => ({ r, i }))
          .filter((row) => row.r[index] !== 0)) {
          cancleEmphasizeText('chord', i);
        }
      }
    },
    [cancleEmphasizeText, dataMatrix],
  );

  useEffect(() => {
    // 设置宽高
    const width = containerRef.current?.clientWidth || 0;
    const height = containerRef.current?.clientHeight || 0;

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
      .padding(defaultConfig.packPadding);

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
      .pie<{ value: number; name: string }>()
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

        const { startAngle, endAngle } = d;
        const midAngle = (startAngle + endAngle) / 2;

        const finnalStartAngle = midAngle - Math.PI / 10;
        const finnalEndAngle = midAngle + Math.PI / 10;
        const radius = outerRadius + 20 * (i % 3);

        // 计算起点和终点坐标（考虑 SVG 中心点）
        const startPoint = {
          x: radius * Math.cos(finnalStartAngle - Math.PI / 2),
          y: radius * Math.sin(finnalStartAngle - Math.PI / 2),
        };
        const endPoint = {
          x: radius * Math.cos(finnalEndAngle - Math.PI / 2),
          y: radius * Math.sin(finnalEndAngle - Math.PI / 2),
        };

        // 构建新的弧路径
        const newArc = `M ${startPoint.x},${startPoint.y} A ${radius},${radius} 0 0 1 ${endPoint.x},${endPoint.y}`;

        chordGroup
          .append('path')
          .attr('class', 'textArc')
          .attr('id', `textArc-${i}`)
          .attr('d', newArc)
          .style('fill', 'none');
      })
      .on('click', function (e, d) {
        const chordIndex = chordData.findIndex((c) => c.name === d.data.name);
        handleElementClick(d3.select(this), chordIndex, 'chord');
      })
      .on('mouseover', function (e, d) {
        const chordIndex = chordData.findIndex((c) => c.name === d.data.name);
        handleElementHover(d3.select(this), chordIndex, 'chord');
      })
      .on('mouseout', function (e, d) {
        const chordIndex = chordData.findIndex((c) => c.name === d.data.name);
        handleElementLeave(d3.select(this), chordIndex, 'chord');
      });

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
        this.setAttribute('fill', 'none');
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
      .on('mouseout', function (_, d) {
        const circleIndex = circleData.findIndex((c) => c.name === d.data.name);
        handleElementLeave(d3.select(this), circleIndex, 'circle');
      });

    // 渲染圆形文本
    circleGroup
      .selectAll('text')
      .data(finnalPackData)
      .enter()
      .append('text')
      .attr('x', (d) => d.x - width / 4)
      .attr('y', (d) => d.y - height / 4)
      .attr('dy', '0.35em')
      .attr('id', (_, i) => `circle-text-${i}`)
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
    for (const arc of arcData) {
      const { data, startAngle, endAngle } = arc;
      const totalValue = data.value;
      const chordIndex = chordData.findIndex((c) => c.name === data.name);

      if (chordIndex === -1) continue;

      let arcOffset = startAngle;
      const rowData = dataMatrix[chordIndex];

      // 弧到圆的映射数据
      const chordMapCircleData = rowData
        .map((item, i) => ({
          value: item,
          circleIndex: i,
          name: circleData[i].name,
        }))
        .sort((a, b) => b.value - a.value);

      for (const { value, circleIndex, name } of chordMapCircleData) {
        const arcStartAngle = arcOffset;
        const arcEndAngle =
          arcStartAngle + (value / totalValue) * (endAngle - startAngle);
        arcOffset = arcEndAngle;

        const packCircle = finnalPackData.find(
          (circle) => circle.data.name === name,
        );
        if (!packCircle) continue;

        const chordPath = d3
          .arc()
          .innerRadius(innerRadius)
          .startAngle(arcStartAngle)
          .endAngle(arcEndAngle)({
            startAngle: arcStartAngle,
            endAngle: arcEndAngle,
            innerRadius: innerRadius - 1,
            outerRadius: innerRadius,
          });

        if (!chordPath) continue;

        const outerArcPath = chordPath.split('A').slice(0, 2).join('A');
        if (outerArcPath.includes('NaN')) continue;

        const startPoint = {
          x: innerRadius * Math.cos(arcStartAngle - Math.PI / 2),
          y: innerRadius * Math.sin(arcStartAngle - Math.PI / 2),
        };

        const endPoint = {
          x: innerRadius * Math.cos(arcEndAngle - Math.PI / 2),
          y: innerRadius * Math.sin(arcEndAngle - Math.PI / 2),
        };

        const centerPos = {
          x: packCircle.x - width / 4,
          y: packCircle.y - height / 4,
        };

        const angle1 = angleBetween(startPoint, { x: 0, y: 0 }, centerPos);
        const angle2 = angleBetween(endPoint, { x: 0, y: 0 }, centerPos);


        const controlPoint1 = {
          x: endPoint.x / 3,
          y: endPoint.y / 3,
        };

        const controlPoint2 = {
          x: startPoint.x / 4,
          y: startPoint.y / 4,
        };

        paths.push({
          path: `${outerArcPath}
              Q${angle1 > 90 ? 0 : controlPoint1.x},${angle1 > 90 ? 0 : controlPoint1.y},${centerPos.x},${centerPos.y}
              Q${angle2 > 90 ? 0 : controlPoint2.x},${angle2 > 90 ? 0 : controlPoint2.y},${startPoint.x},${startPoint.y}`,
          chordName: data.name,
          circleName: name,
          chordIndex,
          circleIndex,
        });
      }
    }

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

          emphasizeText('chord', d.chordIndex);
          emphasizeText('circle', d.circleIndex);

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
          cancleEmphasizeText('chord', d.chordIndex);
          cancleEmphasizeText('circle', d.circleIndex);
          selection.classed('clicked', false);
          onItemUnSelect?.({
            type: 'link',
            data: {
              chordIndex: d.chordIndex,
              circleIndex: d.circleIndex,
              chordName: d.chordName,
              circleName: d.circleName,
            },
          });
          d3.selectAll('.blur').classed('blur', false);
          d3.selectAll('.focus').classed('focus', false);
        } else {
          emphasizeText('chord', d.chordIndex);
          emphasizeText('circle', d.circleIndex);
          for (const chord of prevClicked.current.chords) {
            cancleEmphasizeText('chord', chord);
          }
          for (const circle of prevClicked.current.circles) {
            cancleEmphasizeText('circle', circle);
          }
          d3.selectAll('.clicked').classed('clicked', false);
          selection.classed('clicked', true);
          prevClicked.current.chords = [d.chordIndex];
          prevClicked.current.circles = [d.circleIndex];
          onItemSelect?.({
            type: 'link',
            data: {
              chordIndex: d.chordIndex,
              circleIndex: d.circleIndex,
              chordName: d.chordName,
              circleName: d.circleName,
            },
          });
          onItemSelect?.({
            type: 'chord',
            data: chordData[d.chordIndex],
          });
          onItemSelect?.({
            type: 'circle',
            data: circles[d.circleIndex],
          });
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
      .on('mouseout', function (_, d) {
        handleElementLeave(d3.select(this), d.chordIndex, 'chord');
        handleElementLeave(d3.select(this), d.circleIndex, 'circle');
      });
  }, [
    dataMatrix,
    circleData,
    chordData,
    circles,
    createScales,
    handleElementClick,
    handleElementHover,
    handleElementLeave,
    onItemSelect,
    onItemUnSelect,
    cancleEmphasizeText,
    emphasizeText,
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
