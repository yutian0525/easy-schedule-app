interface TimeLabelItem {
  from: string;
  to: string;
  label: string;
  time: 'morning' | 'afternoon' | 'night';
}


export const timeList: TimeLabelItem[] = [
    {
        "from": "08:15",
        "to": "09:00",
        "label": "1",
        "time": "morning"
    },
    {
        "from": "09:05",
        "to": "09:50",
        "label": "2",
        "time": "morning"
    },
    {
        "from": "10:05",
        "to": "10:50",
        "label": "3",
        "time": "morning"
    },
    {
        "from": "10:55",
        "to": "11:40",
        "label": "4",
        "time": "morning"
    },
    {
        "from": "13:00",
        "to": "13:45",
        "label": "5",
        "time": "afternoon"
    },
    {
        "from": "13:50",
        "to": "14:35",
        "label": "6",
        "time": "afternoon"
    },
    {
        "from": "14:45",
        "to": "15:30",
        "label": "7",
        "time": "afternoon"
    },
    {
        "from": "15:35",
        "to": "16:20",
        "label": "8",
        "time": "afternoon"
    },
    {
        "from": "18:00",
        "to": "18:45",
        "label": "9",
        "time": "night"
    },
    {
        "from": "18:50",
        "to": "19:35",
        "label": "10",
        "time": "night"
    },
    {
        "from": "19:40",
        "to": "20:25",
        "label": "11",
        "time": "night"
    },
    {
        "from": "20:35",
        "to": "21:20",
        "label": "12",
        "time": "night"
    }
]