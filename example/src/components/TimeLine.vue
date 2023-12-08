<script setup lang="ts">
// 一个TimeLine的组件，用于展示一个时间线，包括时间线的名字，时间线中的事件，以及时间线的描述
// A TimeLine component, used to display a timeline, including the name of the timeline, the events in the timeline, and the description of the timeline

import { type PropType } from 'vue';

interface TimeLineEvent {
    from: number;
    to: number;
    name: string;
    description: string;
    backgroundColor: string;
    color: string;
}

defineProps({
    // 时间线的名字
    // The name of the timeline
    name: {
        type: String,
        required: true,
    },
    // 时间线的描述
    // The description of the timeline
    events: {
        type: Array as PropType<TimeLineEvent[]>,
        default: () => [],
    },
    // 时间线的开始时间
    // The start time of the timeline
    from: {
        type: Number,
        default: 0,
    },
    // 时间线的结束时间
    // The end time of the timeline
    to: {
        type: Number,
        default: 100,
    },
    // 单位时间的像素宽度
    // The pixel width of a unit time
    unitWidth: {
        type: Number,
        default: 10,
    },
});

</script>

<template>
    <div class="time-line">
        <div class="time-line_name">{{ name }}</div>
        <div class="time-line_events">
            <div class="time-line_event" v-for="event in events" :key="event.name" :style="{
                left: (event.from - from) * unitWidth + 'px',
                width: ((isFinite(event.to) ? event.to : to) - event.from) * unitWidth + 'px',
                background: event.backgroundColor,
                color: event.color,
            }" :data-duration="isFinite(event.to) ? event.to - event.from : '∞'
    ">
                {{ event.name }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.time-line {
    display: flex;
    flex-wrap: nowrap;
}

.time-line_name {
    width: 80px;
    text-align: right;
    padding-right: 10px;
}

.time-line_events {
    flex: 1;
    position: relative;
}

.time-line_event {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    font-size: 12px;
    background: #fff;
    box-sizing: border-box;
}
</style>