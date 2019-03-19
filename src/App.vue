<template>
  <v-app class="app">
    <toolbar/>
    <v-content :class="$vuetify.breakpoint.mdAndUp? 'content big' : 'content small pt-0'">
      {{fatalError}}
      <v-container fluid class="py-0 px-2">
        <router-view></router-view>
      </v-container>
    </v-content>
    <notification/>
    <snackbar/>
    <promt/>
  </v-app>
</template>
<script>
import { mapGetters } from 'vuex'
export default {
  name: 'App',
  computed: {
    ...mapGetters(['fatalError'])
  },
  watch: {
    fatalError (val) {
      this.$router.push({ name: 'errorpage' })
    }
  }
}
</script>
