import type { Meta, StoryObj } from '@storybook/react';
import { ChordPackChart } from '../../components/ChordPack';
import { generateData } from '../../components/ChordPack/utils';

const meta: Meta<typeof ChordPackChart> = {
  title: 'Example/ChordPack',
  component: ChordPackChart,
  parameters: {
    layout: 'centered'
  }
}

export default meta;

type Story = StoryObj<typeof ChordPackChart>;

const data = generateData(20, 20);

export const IPConversation: Story = {
  args: {
    dataMatrix: data.dataMatrix,
    chordNames: data.domains,
    circleNames: data.names,
    style: {
      width: '900px',
      height: '900px'
    },
    onItemSelect: (info) => {
      console.log(info);
    },
    onItemUnSelect: (info) => {
      console.log(info);
    }
  }
}

