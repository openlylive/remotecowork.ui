import cookie from 'js-cookie'

export default function createPlugin () {
  return store => {
    store.subscribe((mutation, state) => {
      if (mutation.type === 'setUserName' || mutation.type === 'setUserKeys') {
        // cookie.set('user', state.user.user)
        const old = JSON.parse(window.localStorage.getItem('user'))
        console.log(old)
        const updated = state.user.user
        var newUser
        if (old) {
          console.log('assign:', old, updated)
          newUser = Object.assign(old, updated)
          console.log('newUser should be:', newUser)
        } else {
          newUser = updated
        }
        console.log('Setting localstorage:', JSON.stringify(newUser))
        window.localStorage.setItem('user', JSON.stringify(newUser))
      } else if (['setTeamName', 'setTeamSettings', 'setSymKey', 'setTeamAdmin'].includes(mutation.type)) {
        cookie.set('teamsettings', state.team.teamSettings)
      } else if (['addTeamMembers', 'deleteTeamMembers', 'updateTeamMember', 'updateTeamMemberLocation', 'disconnectedTeamMembers', 'connectedTeamMembers', 'setTeamMembers', 'clearHistory'].includes(mutation.type)) {
        window.localStorage.setItem('teammembers', JSON.stringify(state.team.teamMembers))
      }
    })
  }
}
