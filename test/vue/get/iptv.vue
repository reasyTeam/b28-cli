<template>
  <div>
    <v-form :ref="name">
    <div title="我是标题">{{'这是测试1' + test}}</div>
    <div :title="anna">{{_('这是测试2') + check}}</div>
    <div :key="_('我也是标题')">我就是一段纯文本而已！</div>
    <v-pop :option="dialog" v-model="dialog.show">这是内容：{{coneten + mess}}</v-pop>
      <v-form-item vname="v-switch" v-model="formData.igmpEn" :data-key="igmpEn" :title="_('组播')"></v-form-item>
      <v-form-item vname="v-switch" v-model="formData.stbEn" :data-key="stbEn" :title="_('STB')">
        <span class="help-tips" v-show="formData.stbEn === 'true'">请将IPTV机顶盒连接到路由器的IPTV口</span>
      </v-form-item>
    </v-form>
    <v-elem :show="formData.vlanType === 'manual' && formData.stbEn === 'true'">
      <v-table :data="tableData" class="btn-tb-position">
        <template #header>
          <tr>
            <td width="200px"></td>
            <td class="text-left">
              <v-form-item vname="v-input" ref="vlan" v-model="inputVlanId.val" :data-key="inputVlanId"></v-form-item>
            </td>
            <td><v-button title="新增" css="icon-add" :callback="addVlanList" name="addVlanList"></v-button></td>
          </tr>
        </template>
        <v-table-col css="text-left" width="200px" field="selected" :title="_('上行报文VLAN选择')">
          <template v-slot="slotScope">
            <label class="pointer">
              <span
                @click="formData.upVlanId = slotScope.vlanId"
                class="raido-item"
                :class="slotScope.vlanId === formData.upVlanId ? 'v-icon-radio-checked' : 'v-icon-radio-unchecked'"
              ></span>
            </label>
          </template>
        </v-table-col>
        <v-table-col css="text-left" field="vlanId" :title="_('VLAN')"> </v-table-col>
        <v-table-col field="action" :title="_('操作')">
          <template v-slot="slotScope">
            <span v-tooltip="_('删除')" class="action-bg icon-delete" @click="delRule(slotScope)"> </span>
            <span v-tooltip="_('删除') + '谢谢' + _('兰兰')" class="action-bg icon-delete" @click="delRule(slotScope)"> </span>
            <span tip="天下苍生" class="action-bg icon-delete" @click="delRule(slotScope)"> </span>
          </template>
        </v-table-col>
      </v-table>
      <!-- <v-form-item vname="v-input" v-model="formData.vlanId" :data-key="inputVlanId" :title="_('VLAN ID')">
        <span class="help-tips">多个VLAN ID用“，”隔开</span>
      </v-form-item>
      <v-form-item
        vname="v-input"
        v-model="formData.upVlanId"
        :data-key="upVlanId"
        :title="_('上行VLAN ID')"
      ></v-form-item> -->
    </v-elem>
  </div>
</template>

<script lang="ts">
import { mixins } from "vue-class-component";
import { Component, Watch } from "vue-property-decorator";
import { SWITCH_EN } from "@/config/common/public";
import { copy } from "@/common/libs/libs";
import FormMixin from "@/components/form-mixins";

@Component
export default class AdvIPTV extends mixins(FormMixin) {
  igmpEn = copy(SWITCH_EN, {
    name: "igmpEn"
  });
  stbEn = copy(SWITCH_EN, {
    name: "stbEn"
  });
  tableData: Array<ObjectAny> = [];
  vlanType = {
    val: "default",
    name: "vlanType",
    show: true,
    type: "text",
    placeholder: _("请输入旧密码"),
    sortArray: [
      {
        title: _("默认"),
        value: "default"
      },
      {
        title: _("自定义"),
        value: "manual"
      }
    ]
  };

  inputVlanId = {
    val: "",
    name: "inputVlanId",
    valid: "num",
    maxlength: 4,
    min: 4,
    max: 4094
  };

  //添加VLAN
  addVlanList() {
    if (this.tableData.length >= 8) {
      this.$message(_("Only a maximum of %s VLANs are allowed.", [8]));
      return;
    }
    let result = this.$refs.vlan.checkVal();

    if (!result) {
      return;
    }
    //验证OK
    let hasVlan = this.tableData.some((item) => item.vlanId === this.inputVlanId.val);
    if (hasVlan) {
      this.$message(_("Duplicate VLAN IDs are not allowed."));
      return;
    }
    //新增第一条时，选中
    if (this.tableData.length === 0) {
      this.formData.upVlanId = this.inputVlanId.val;
    }
    //添加vlan
    if (this.formData.vlanId != "") {
      this.formData.vlanId += ",";
    } 
    this.formData.vlanId += this.inputVlanId.val;

    //清空输入框
    this.inputVlanId.val = "";
  }

  //删除VLAN
  delRule(data: ObjectAny) {
    if (data.vlanId === this.formData.upVlanId) {
      this.formData.upVlanId = this.tableData[0].vlanId;
    }
    let vlanList = this.formData.vlanId.split(",");
    vlanList.splice(data.$index, 1);
    this.formData.vlanId = vlanList.join(",");
    //this.tableData.splice(data.$index, 1);
    if (this.tableData.length === 0) {
      this.formData.upVlanId = "";
    }
  }

  beforeSubmit(data: ObjectAny) {
    if (data.vlanType === "manual") {
      if (this.tableData.length === 0) {
        return "请选择一个VLAN ID";
      }
      data.upVlanId = this.formData.upVlanId;
      data.vlanId = this.formData.vlanId;
    }
    return data;
  }

  @Watch("formData.vlanId", { immediate: true })
  onVlanIdChanged(val: string) {
    if (!val) {
      return;
    }
    let vlanArr = val.split(",");

    //当未选中时，默认选中第一个
    if (vlanArr.length > 0 && vlanArr.indexOf(this.formData.upVlanId) === -1) {
      this.formData.upVlanId = vlanArr[0];
    }
    this.tableData = [];
    vlanArr.forEach((item: string) => {
      this.tableData.push({
        vlanId: item
      });
    });
  }
}
</script>
