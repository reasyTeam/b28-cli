<template>
  <div>
    <span class="internet-topo__position__text fixed" v-tooltip="wifiSSID">
      {{ doubleBand ? "2.4G&5G:" : "2.4G:" }}
      {{ wifiSSID }}
    </span>
    {{ doubleBand ? "2.4G&5G:" : "2.4G:" }}
    {{ wifiSSID }}
    <span>{{ "/" + totalPage + "页" }}</span>
    <div>
      {{ slotProps.deviceRate + "Mbps" }}
    </div>
    <span>{{ item + 1 + "月" }}</span>
    <v-col :span="isRange ? 12 : 24">
      {{ isRange ? "开始时间" : "时间" }}
    </v-col>
    <v-col :span="isRange ? 12 : 24">
      {{ isRange ? _("开始时间4") : "时间4" }}
    </v-col>
    <v-col :span="isRange ? 12 : 24">
      测试用例1
      {{ isRange ? "开始时间1" : "时间1" }}
    </v-col>
    <v-col :span="isRange ? 12 : 24">
      测试用例1
      {{ isRange ? _("开始时间2") : "时间2" }}
    </v-col>
    <v-col :span="isRange ? 12 : 24">
      测试用例3
      {{ isRange ? _("开始时间3") : node }}
    </v-col>
    <div>测试用例4 {{ item }}</div>

    <button
      :header-label="_('主网络设备') + '(' + onlineList.length + ')'"
    ></button>
    <button>
      {{ "这是另一个按钮" }}
    </button>

    <div class="login-forget-button">
      <v-button type="primary" @click="showDialogTips = false">{{
        _("我知道了")
      }}</v-button>
    </div>
  </div>
</template>
