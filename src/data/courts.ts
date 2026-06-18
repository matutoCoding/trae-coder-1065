import type { Court } from '@/types';

export const courts: Court[] = [
  {
    id: 'court_001',
    name: '1号球场',
    type: 'hard',
    typeLabel: '硬地',
    pricePerHour: 80,
    capacity: 4,
    description: '标准硬地网球场，配备专业照明系统',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/500',
    tags: ['室外', '硬地', '标准尺寸']
  },
  {
    id: 'court_002',
    name: '2号球场',
    type: 'hard',
    typeLabel: '硬地',
    pricePerHour: 80,
    capacity: 4,
    description: '硬地网球场，适合日常训练和比赛',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/501',
    tags: ['室外', '硬地', '标准尺寸']
  },
  {
    id: 'court_003',
    name: '3号球场',
    type: 'clay',
    typeLabel: '红土',
    pricePerHour: 120,
    capacity: 4,
    description: '专业红土球场，脚感舒适，适合专业训练',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/502',
    tags: ['室外', '红土', '专业级']
  },
  {
    id: 'court_004',
    name: '4号球场',
    type: 'grass',
    typeLabel: '草地',
    pricePerHour: 150,
    capacity: 4,
    description: '温网同款草地球场，球速快，体验极佳',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/503',
    tags: ['室外', '草地', '高端']
  },
  {
    id: 'court_005',
    name: '5号球场',
    type: 'indoor',
    typeLabel: '室内',
    pricePerHour: 180,
    capacity: 4,
    description: '室内恒温硬地球场，不受天气影响',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/504',
    tags: ['室内', '恒温', '全天候']
  },
  {
    id: 'court_006',
    name: '6号球场',
    type: 'indoor',
    typeLabel: '室内',
    pricePerHour: 180,
    capacity: 4,
    description: '室内专业球场，配备休息区和更衣室',
    status: 'maintenance',
    imageUrl: 'https://picsum.photos/id/1058/750/505',
    tags: ['室内', 'VIP', '含休息区']
  },
  {
    id: 'court_007',
    name: '7号球场（儿童）',
    type: 'hard',
    typeLabel: '硬地',
    pricePerHour: 50,
    capacity: 6,
    description: '儿童专用球场，尺寸较小，安全防护完善',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/506',
    tags: ['室外', '儿童', '安全防护']
  },
  {
    id: 'court_008',
    name: '8号球场',
    type: 'clay',
    typeLabel: '红土',
    pricePerHour: 120,
    capacity: 4,
    description: '红土球场，适合慢速对拉和技巧训练',
    status: 'available',
    imageUrl: 'https://picsum.photos/id/1058/750/507',
    tags: ['室外', '红土', '专业级']
  }
];

export const getCourtById = (id: string): Court | undefined => {
  return courts.find((c) => c.id === id);
};

export const getAvailableCourts = (): Court[] => {
  return courts.filter((c) => c.status === 'available');
};
