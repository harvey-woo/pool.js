<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import TimeLine from './TimeLine.vue';
import { Pool } from '../../../';

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


function getRandomDuration() {
  // 生产一个以50ms为基础单位的随机时间，100ms - 500ms 的时间段
  return Math.floor(Math.random() * 10) * 50 + 100;
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

// 获取对比色
function getContrastColor(color: string) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  return gray > 186 ? '#000' : '#fff';
}

async function eventFunc(this: { name: string }) {
  // 等待随机时间，单位100ms
  await wait(getRandomDuration());
}

interface TimeLineData {
  name: string;
  events: {
    name: string;
    from: number;
    to: number;
    description: string;
    backgroundColor: string;
    color: string;
  }[];
}

let startTime = Date.now();

const timeLineData = ref<TimeLineData[]>([]);

const currentTime = ref(0);
const interval = setInterval(() => {
  currentTime.value = Date.now() - startTime;
}, 4);

let i = 0;
function trackEvent(eventFn: typeof eventFunc): typeof eventFunc {
  return async function (this: { name: string }) {
    const from = Date.now() - startTime;
    i++;
    const backgroundColor = getRandomColor();
    const timeLineEvent = reactive({
      name: `${i}`,
      from: from,
      to: Infinity,
      description: 'event',
      backgroundColor: backgroundColor,
      color: getContrastColor(getRandomColor()),
    });
    let timeLine = timeLineData.value.find((timeLine) => timeLine.name === this.name);
    if (!timeLine) {
      timeLine = {
        name: this.name,
        events: [],
      };
      timeLineData.value.push(timeLine);
    }
    console.log(`第${i}次调用消费函数，开始占用资源 ${this.name}: ${Date.now()}`);
    timeLine.events.push(timeLineEvent);
    const result = await eventFn.call(this);
    timeLineEvent.to = Date.now() - startTime;
    console.log(`结束占用资源 ${this.name}: ${Date.now()}`);
    return result;
  };
}

const pool = Pool.from((new Array(3)).fill(1).map((_, i) => ({ name: `resource ${i}` })));


onMounted(async () => {
  startTime = Date.now();
  const limiter = pool.limit();

  await Promise.all(new Array(20).fill(1).map((_, i) => {
    return limiter(trackEvent(eventFunc));
  }));

  clearInterval(interval);
})

</script>
<template>
  <div>
    <TimeLine :style="{ margin: '5px 0' }" v-for="timeLine in timeLineData" :key="timeLine.name" :name="timeLine.name"
      :from="0" :to="currentTime" :events="timeLine.events" :unit-width="0.3" />
  </div>
</template>