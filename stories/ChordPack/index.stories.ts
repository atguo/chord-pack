import ChordPackChart from '../../components/ChordPack';
import { chords, circles, dataMatrix } from './data';
import { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ChordPackChart> = {
  title: 'Example/ChordPack',
  component: ChordPackChart,
  parameters: {
    layout: 'centered'
  }
}

export default meta;

type Story = StoryObj<typeof ChordPackChart>;

export const IPConversation: Story = {
  args: {
    dataMatrix,
    chordNames: Array.from(chords),
    circleNames: Array.from(circles),
    style: {
      width: '900px',
      height: '900px'
    }
  }
}