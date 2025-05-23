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