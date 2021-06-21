import { createApp } from 'vue'
import App from './App.vue'
import {Upload, Image, Modal, Carousel, Drawer, Form, Input, Button, Switch, Spin} from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';

const app = createApp(App);

app.use(Upload);
app.use(Image);
app.use(Modal);
app.use(Carousel);
app.use(Drawer);
app.use(Input);
app.use(Form);
app.use(Button);
app.use(Switch);
app.use(Spin);

app.mount('#app')
