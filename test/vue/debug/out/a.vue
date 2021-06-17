<template>
<div>
    <span>{{_('/%s page', [totalPage])}}</span>
    <div>{{_('%sMbps', [slotProps.deviceRate])}}</div>
    <span>{{_('%s%s Month', [item, 1])}}</span>
    <v-col :span="isRange ? 12 : 24">
      {{ isRange ? _('start time') : _('time') }}
    </v-col>
    <v-col :span="isRange ? 12 : 24">
      {{ isRange ? _("start time 4444") : _('time 4444') }}
    </v-col>
    <v-col :span="isRange ? 12 : 24">{{_('test demo 1 %s', [isRange ? _('start time 1111') : _('time 11111')])}}</v-col>
    <v-col :span="isRange ? 12 : 24">{{_('test demo 1 %s', [isRange ? _("start time 2222") : _('time 2222')])}}</v-col>
    <v-col :span="isRange ? 12 : 24">{{_('test demo 3 %s', [isRange ? _("start time 3333") : node])}}</v-col>
    <div>{{_('test demo 4 %s', [item])}}</div>

    <button
      :header-label="_('main device') + '(' + onlineList.length + ')'"
    ></button>
    <button>
      {{ _('this is another button') }}
    </button>

    <div class="login-forget-button">
      <v-button type="primary" @click="showDialogTips = false">{{
        _("I knew")
      }}</v-button>
    </div>

    <div>{{_('%sMbps', [slotProps.deviceRate])}}</div>
    <span>{{_('/%s page', [totalPage])}}</span>
    <span>{{_('%s%s Month', [item, 1])}}</span>
  </div>
</template>

