<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import TimeLine from './TimeLine.vue';
import { Pool, type Limiter } from '../../../';

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


function getRandomDuration() {
  // 生产一个以50ms为基础单位的随机时间，100ms - 500ms 的时间段
  // Producer a random duration, 100ms - 500ms
  return Math.floor(Math.random() * 10) * 50 + 100;
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

// 获取对比色
// Get contrast color
function getContrastColor(color: string) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  return gray > 186 ? '#000' : '#fff';
}

async function eventFunc(this: { name: string }) {
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

let startTime = ref(Date.now())

const timeLineData = ref<TimeLineData[]>([]);

const currentTime = ref(0);

let i = 0;
function trackEvent(eventFn: typeof eventFunc): typeof eventFunc {
  return async function (this: { name: string }) {
    const from = Date.now() - startTime.value;
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
    timeLine.events.push(timeLineEvent);
    const result = await eventFn.call(this);
    timeLineEvent.to = Date.now() - startTime.value;
    return result;
  };
}



let interval: number | undefined;

let minDuration = ref('300');
let resourceCount = ref(3);
let limiter: Limiter<{ name: string }> | undefined;

async function start() {
  const pool = new Pool((created) => {
    if (created >= resourceCount.value) {
      return undefined;
    }
    return {
      name: `resource ${created}`,
    };
  })
  pool.clear();
  startTime.value = Date.now();
  timeLineData.value = [];
  i = 0;
  if (limiter) limiter.abort();
  limiter = pool.limit({ minDuration: minDuration.value ? parseInt(minDuration.value) : 0 });
  if (typeof interval === 'number') clearInterval(interval);
  interval = setInterval(() => {
    currentTime.value = Date.now() - startTime.value;
  }, 4);
  const l = limiter;
  await Promise.all(new Array(20).fill(1).map((_, i) => {
    return l(trackEvent(eventFunc));
  }));
  clearInterval(interval);
}

onMounted(async () => {
  start();
})

</script>
<template>
  <form style="margin-bottom: 20px">
    <label>最小间隔 minDuration<input style="margin-left: 5px" type="number" v-model="minDuration" /></label>
    <label style="margin-left: 5px">资源数量 resource size<input style="margin-left: 5px" type="number"
        v-model="resourceCount" /></label>
    <button style="margin-left: 5px" type="button" @click="start">开始 start</button>
  </form>
  <div>
    <TimeLine :style="{ margin: '5px 0' }" v-for="timeLine in timeLineData" :key="timeLine.name" :name="timeLine.name"
      :from="0" :to="currentTime" :events="timeLine.events" :unit-width="0.3" />
  </div>
</template>
