import { Random } from "mockjs";

export function sum(data: number[]) {
  return data.reduce((acc, curr) => acc + curr, 0);
}


export const generateData = (domainNum: number, nameNum: number) => {
  const domains: string[] = [];
  const names: string[] = [];

  for (let i = 0; i < domainNum; i++) {
    domains.push(Random.domain());
  }

  for (let i = 0; i < nameNum; i++) {
    names.push(Random.name());
  }

  const dataMatrix: number[][] = new Array(domainNum)
    .fill(null)
    .map(() => new Array(nameNum).fill(0));

  for (let i = 0; i < domainNum; i++) {
    // 该域名总共分配名称数量
    const allocateNameCount = Random.integer(0, 10);
    // 已分配name下标，为了不重复分配
    const usedNames: number[] = [];
    for (let j = 0; j < allocateNameCount; j++) {
      // 当前下标
      let tmpNameIndex = Random.integer(0, nameNum - 1);
      while (usedNames.includes(tmpNameIndex)) {
        tmpNameIndex = Random.integer(0, nameNum - 1);
      }

      dataMatrix[i][tmpNameIndex] = Random.integer(1, 1000);
    }
  }

  return {
    domains,
    names,
    dataMatrix,
  };
};

interface Point {
  x: number;
  y: number;
}

// 计算p1-p2-p3的夹角
export function angleBetween(p1: Point, p2: Point, p3: Point) {
  const ax = p2.x - p1.x;
  const ay = p2.y - p1.y;

  // 向量 B = p3 - p2
  const bx = p3.x - p2.x;
  const by = p3.y - p2.y;

  // 点积 A·B
  const dot = ax * bx + ay * by;

  // 向量长度
  const lenA = Math.sqrt(ax * ax + ay * ay);
  const lenB = Math.sqrt(bx * bx + by * by);

  if (lenA === 0 || lenB === 0) {
    throw new Error("向量长度为 0，无法计算角度");
  }

  // 夹角（弧度）
  const cosTheta = dot / (lenA * lenB);
  const clampedCos = Math.max(-1, Math.min(1, cosTheta)); // 防止精度问题超出范围
  const rad = Math.acos(clampedCos);

  // 转为角度
  const deg = (rad * 180) / Math.PI;

  return deg;
}

