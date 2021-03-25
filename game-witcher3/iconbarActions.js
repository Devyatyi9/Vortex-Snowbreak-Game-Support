"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerActions = void 0;
const path_1 = __importDefault(require("path"));
const vortex_api_1 = require("vortex-api");
const common_1 = require("./common");
function resetPriorities(props) {
    const { context, refreshFunc } = props;
    const state = context.api.getState();
    const profile = vortex_api_1.selectors.activeProfile(state);
    const loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', profile.id], {});
    const newLO = Object.keys(loadOrder).reduce((accum, key) => {
        const loEntry = loadOrder[key];
        accum[key] = Object.assign(Object.assign({}, loEntry), { prefix: loEntry.pos + 1 });
        return accum;
    }, {});
    context.api.store.dispatch(vortex_api_1.actions.setLoadOrder(profile.id, newLO));
    if (refreshFunc !== undefined) {
        refreshFunc();
    }
    return newLO;
}
exports.registerActions = (props) => {
    var _a;
    const { context, refreshFunc, getPriorityManager } = props;
    const openTW3DocPath = () => {
        const docPath = path_1.default.join(common_1.UNIAPP.getPath('documents'), 'The Witcher 3');
        vortex_api_1.util.opn(docPath).catch(() => null);
    };
    const isTW3 = (gameId = undefined) => {
        if (gameId !== undefined) {
            return (gameId === common_1.GAME_ID);
        }
        const state = context.api.getState();
        const gameMode = vortex_api_1.selectors.activeGameId(state);
        return (gameMode === common_1.GAME_ID);
    };
    context.registerAction('generic-load-order-icons', 300, 'save', {}, ((_a = getPriorityManager()) === null || _a === void 0 ? void 0 : _a.priorityType) === 'position-based'
        ? 'Switch to Prefix-based'
        : 'Switch to Position-based', () => {
        const priorityManager = getPriorityManager();
        if (priorityManager === undefined) {
            return;
        }
        else {
            priorityManager.priorityType = (priorityManager.priorityType === 'position-based')
                ? 'prefix-based' : 'position-based';
        }
    }, isTW3);
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open TW3 Documents Folder', openTW3DocPath, isTW3);
    context.registerAction('generic-load-order-icons', 300, 'open-ext', {}, 'Open TW3 Documents Folder', openTW3DocPath, isTW3);
    context.registerAction('generic-load-order-icons', 100, 'loot-sort', {}, 'Reset Priorities', () => {
        context.api.showDialog('info', 'Reset Priorities', {
            bbcode: context.api.translate('This action will revert all manually set priorities and will re-instate priorities in an incremental '
                + 'manner starting from 1. Are you sure you want to do this ?', { ns: common_1.I18N_NAMESPACE }),
        }, [
            { label: 'Cancel', action: () => {
                    return;
                } },
            { label: 'Reset Priorities', action: () => resetPriorities(props) },
        ]);
    }, () => {
        const state = context.api.store.getState();
        const gameMode = vortex_api_1.selectors.activeGameId(state);
        return gameMode === common_1.GAME_ID;
    });
    context.registerAction('generic-load-order-icons', 100, 'loot-sort', {}, 'Sort by Deploy Order', () => {
        context.api.showDialog('info', 'Sort by Deployment Order', {
            bbcode: context.api.translate('This action will set priorities using the deployment rules '
                + 'defined in the mods page. Are you sure you wish to proceed ?[br][/br][br][/br]'
                + 'Please be aware that any externally added mods (added manually or by other tools) will be pushed '
                + 'to the bottom of the list, while all mods that have been installed through Vortex will shift '
                + 'in position to match the deploy order!', { ns: common_1.I18N_NAMESPACE }),
        }, [
            { label: 'Cancel', action: () => {
                    return;
                } },
            { label: 'Sort by Deploy Order', action: () => {
                    const state = context.api.getState();
                    const gameMods = state.persistent.mods[common_1.GAME_ID] || {};
                    const profile = vortex_api_1.selectors.activeProfile(state);
                    const mods = Object.keys(gameMods)
                        .filter(key => vortex_api_1.util.getSafe(profile, ['modState', key, 'enabled'], false))
                        .map(key => gameMods[key]);
                    return vortex_api_1.util.sortMods(common_1.GAME_ID, mods, context.api)
                        .then(sorted => {
                        const loadOrder = vortex_api_1.util.getSafe(state, ['persistent', 'loadOrder', profile.id], {});
                        const filtered = Object.keys(loadOrder).filter(key => sorted.find(mod => mod.id === key) !== undefined);
                        const manuallyAdded = Object.keys(loadOrder).filter(key => !filtered.includes(key));
                        const minimumIdx = manuallyAdded
                            .filter(key => key.includes(common_1.LOCKED_PREFIX))
                            .reduce((min, key) => {
                            if (min <= loadOrder[key].pos) {
                                min = loadOrder[key].pos + 1;
                            }
                            return min;
                        }, 0);
                        const manualLO = manuallyAdded.reduce((accum, key, idx) => {
                            if (key.includes(common_1.LOCKED_PREFIX)) {
                                accum[key] = loadOrder[key];
                                return accum;
                            }
                            const minimumPosition = (filtered.length + minimumIdx + 1);
                            if (loadOrder[key].pos < minimumPosition) {
                                accum[key] = Object.assign(Object.assign({}, loadOrder[key]), { pos: loadOrder[key].pos + (minimumPosition + idx), prefix: loadOrder[key].pos + (minimumPosition + idx + 1) });
                                return accum;
                            }
                            else {
                                accum[key] = loadOrder[key];
                                return accum;
                            }
                        }, {});
                        const newLO = filtered.reduce((accum, key) => {
                            const loEntry = loadOrder[key];
                            const idx = sorted.findIndex(mod => mod.id === key);
                            const assignedIdx = minimumIdx + idx;
                            accum[key] = Object.assign(Object.assign({}, loEntry), { pos: assignedIdx, prefix: assignedIdx + 1 });
                            return accum;
                        }, manualLO);
                        context.api.store.dispatch(vortex_api_1.actions.setLoadOrder(profile.id, newLO));
                        if (refreshFunc !== undefined) {
                            refreshFunc();
                        }
                    })
                        .catch(err => {
                        const allowReport = !(err instanceof vortex_api_1.util.CycleError);
                        context.api.showErrorNotification('Failed to sort by deployment order', err, { allowReport });
                    });
                } },
        ]);
    }, () => {
        const state = context.api.store.getState();
        const gameMode = vortex_api_1.selectors.activeGameId(state);
        return gameMode === common_1.GAME_ID;
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbmJhckFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpY29uYmFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsMkNBQTZEO0FBRTdELHFDQUEwRTtBQVMxRSxTQUFTLGVBQWUsQ0FBQyxLQUFhO0lBQ3BDLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDO0lBQ3ZDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDckMsTUFBTSxPQUFPLEdBQUcsc0JBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDL0MsTUFBTSxTQUFTLEdBQUcsaUJBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDekQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLEtBQUssQ0FBQyxHQUFHLENBQUMsbUNBQ0wsT0FBTyxLQUNWLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsR0FDeEIsQ0FBQztRQUNGLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLG9CQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBWSxDQUFDLENBQUMsQ0FBQztJQUMzRSxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7UUFDN0IsV0FBVyxFQUFFLENBQUM7S0FDZjtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVZLFFBQUEsZUFBZSxHQUFHLENBQUMsS0FBYSxFQUFFLEVBQUU7O0lBQy9DLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsS0FBSyxDQUFDO0lBQzNELE1BQU0sY0FBYyxHQUFHLEdBQUcsRUFBRTtRQUMxQixNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLGVBQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDeEUsaUJBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQztJQUVGLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxHQUFHLFNBQVMsRUFBRSxFQUFFO1FBQ25DLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRTtZQUN4QixPQUFPLENBQUMsTUFBTSxLQUFLLGdCQUFPLENBQUMsQ0FBQztTQUM3QjtRQUNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckMsTUFBTSxRQUFRLEdBQUcsc0JBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0MsT0FBTyxDQUFDLFFBQVEsS0FBSyxnQkFBTyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDO0lBRUYsT0FBTyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFDaEUsT0FBQSxrQkFBa0IsRUFBRSwwQ0FBRSxZQUFZLE1BQUssZ0JBQWdCO1FBQ3JELENBQUMsQ0FBQyx3QkFBd0I7UUFDMUIsQ0FBQyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxNQUFNLGVBQWUsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBQzdDLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRTtZQUNqQyxPQUFPO1NBQ1I7YUFBTTtZQUNMLGVBQWUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxlQUFlLENBQUMsWUFBWSxLQUFLLGdCQUFnQixDQUFDO2dCQUNoRixDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQztTQUN2QztJQUNMLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUVaLE9BQU8sQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUNoQywyQkFBMkIsRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFM0UsT0FBTyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFDL0MsMkJBQTJCLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRTNFLE9BQU8sQ0FBQyxjQUFjLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQ3pGLEdBQUcsRUFBRTtRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsRUFBRTtZQUNqRCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsdUdBQXVHO2tCQUNqSSw0REFBNEQsRUFBRSxFQUFFLEVBQUUsRUFBRSx1QkFBYyxFQUFFLENBQUM7U0FDMUYsRUFBRTtZQUNELEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO29CQUM5QixPQUFPO2dCQUNULENBQUMsRUFBQztZQUNGLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxFQUFFLEdBQUcsRUFBRTtRQUNOLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzNDLE1BQU0sUUFBUSxHQUFHLHNCQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE9BQU8sUUFBUSxLQUFLLGdCQUFPLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFFTCxPQUFPLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLHNCQUFzQixFQUM3RixHQUFHLEVBQUU7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsMEJBQTBCLEVBQUU7WUFDekQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLDZEQUE2RDtrQkFDdkYsZ0ZBQWdGO2tCQUNoRixtR0FBbUc7a0JBQ25HLCtGQUErRjtrQkFDL0Ysd0NBQXdDLEVBQUUsRUFBRSxFQUFFLEVBQUUsdUJBQWMsRUFBRSxDQUFDO1NBQ3RFLEVBQUU7WUFDRCxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtvQkFDOUIsT0FBTztnQkFDVCxDQUFDLEVBQUM7WUFDRixFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO29CQUM1QyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNyQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxnQkFBTyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUN0RCxNQUFNLE9BQU8sR0FBRyxzQkFBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDL0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7eUJBQy9CLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLGlCQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsU0FBUyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7eUJBQ3pFLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUM3QixPQUFPLGlCQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUM7eUJBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDYixNQUFNLFNBQVMsR0FBRyxpQkFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDbkYsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FDbkQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUM7d0JBQ3BELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ3BGLE1BQU0sVUFBVSxHQUFHLGFBQWE7NkJBQzdCLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQWEsQ0FBQyxDQUFDOzZCQUMxQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7NEJBQ25CLElBQUksR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUU7Z0NBQzdCLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQzs2QkFDOUI7NEJBQ0QsT0FBTyxHQUFHLENBQUM7d0JBQ2IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3dCQUNSLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFOzRCQUN4RCxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQWEsQ0FBQyxFQUFFO2dDQUMvQixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dDQUM1QixPQUFPLEtBQUssQ0FBQzs2QkFDZDs0QkFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDOzRCQUMzRCxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsZUFBZSxFQUFFO2dDQUN4QyxLQUFLLENBQUMsR0FBRyxDQUFDLG1DQUNMLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FDakIsR0FBRyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLEVBQ2pELE1BQU0sRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsZUFBZSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FDekQsQ0FBQztnQ0FDRixPQUFPLEtBQUssQ0FBQzs2QkFDZDtpQ0FBTTtnQ0FDTCxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dDQUM1QixPQUFPLEtBQUssQ0FBQzs2QkFDZDt3QkFDSCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ1AsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTs0QkFDM0MsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUMvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQzs0QkFDcEQsTUFBTSxXQUFXLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQzs0QkFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQ0FDTCxPQUFPLEtBQ1YsR0FBRyxFQUFFLFdBQVcsRUFDaEIsTUFBTSxFQUFFLFdBQVcsR0FBRyxDQUFDLEdBQ3hCLENBQUM7NEJBQ0YsT0FBTyxLQUFLLENBQUM7d0JBQ2YsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUViLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxvQkFBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQVksQ0FBQyxDQUFDLENBQUM7d0JBQzNFLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTs0QkFDN0IsV0FBVyxFQUFFLENBQUM7eUJBQ2Y7b0JBQ0gsQ0FBQyxDQUFDO3lCQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRTt3QkFDWCxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsR0FBRyxZQUFZLGlCQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUN6RSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7b0JBQ3JCLENBQUMsQ0FBQyxDQUFDO2dCQUNQLENBQUMsRUFBQztTQUNILENBQUMsQ0FBQztJQUNMLENBQUMsRUFBRSxHQUFHLEVBQUU7UUFDTixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQyxNQUFNLFFBQVEsR0FBRyxzQkFBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxPQUFPLFFBQVEsS0FBSyxnQkFBTyxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGFjdGlvbnMsIHNlbGVjdG9ycywgdHlwZXMsIHV0aWwgfSBmcm9tICd2b3J0ZXgtYXBpJztcclxuXHJcbmltcG9ydCB7IEdBTUVfSUQsIEkxOE5fTkFNRVNQQUNFLCBMT0NLRURfUFJFRklYLCBVTklBUFAgfSBmcm9tICcuL2NvbW1vbic7XHJcbmltcG9ydCB7IFByaW9yaXR5TWFuYWdlciB9IGZyb20gJy4vcHJpb3JpdHlNYW5hZ2VyJztcclxuXHJcbmludGVyZmFjZSBJUHJvcHMge1xyXG4gIGNvbnRleHQ6IHR5cGVzLklFeHRlbnNpb25Db250ZXh0O1xyXG4gIHJlZnJlc2hGdW5jOiAoKSA9PiB2b2lkO1xyXG4gIGdldFByaW9yaXR5TWFuYWdlcjogKCkgPT4gUHJpb3JpdHlNYW5hZ2VyO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNldFByaW9yaXRpZXMocHJvcHM6IElQcm9wcykge1xyXG4gIGNvbnN0IHsgY29udGV4dCwgcmVmcmVzaEZ1bmMgfSA9IHByb3BzO1xyXG4gIGNvbnN0IHN0YXRlID0gY29udGV4dC5hcGkuZ2V0U3RhdGUoKTtcclxuICBjb25zdCBwcm9maWxlID0gc2VsZWN0b3JzLmFjdGl2ZVByb2ZpbGUoc3RhdGUpO1xyXG4gIGNvbnN0IGxvYWRPcmRlciA9IHV0aWwuZ2V0U2FmZShzdGF0ZSwgWydwZXJzaXN0ZW50JywgJ2xvYWRPcmRlcicsIHByb2ZpbGUuaWRdLCB7fSk7XHJcbiAgY29uc3QgbmV3TE8gPSBPYmplY3Qua2V5cyhsb2FkT3JkZXIpLnJlZHVjZSgoYWNjdW0sIGtleSkgPT4ge1xyXG4gICAgY29uc3QgbG9FbnRyeSA9IGxvYWRPcmRlcltrZXldO1xyXG4gICAgYWNjdW1ba2V5XSA9IHtcclxuICAgICAgLi4ubG9FbnRyeSxcclxuICAgICAgcHJlZml4OiBsb0VudHJ5LnBvcyArIDEsXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIGFjY3VtO1xyXG4gIH0sIHt9KTtcclxuICBjb250ZXh0LmFwaS5zdG9yZS5kaXNwYXRjaChhY3Rpb25zLnNldExvYWRPcmRlcihwcm9maWxlLmlkLCBuZXdMTyBhcyBhbnkpKTtcclxuICBpZiAocmVmcmVzaEZ1bmMgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVmcmVzaEZ1bmMoKTtcclxuICB9XHJcbiAgcmV0dXJuIG5ld0xPO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgcmVnaXN0ZXJBY3Rpb25zID0gKHByb3BzOiBJUHJvcHMpID0+IHtcclxuICBjb25zdCB7IGNvbnRleHQsIHJlZnJlc2hGdW5jLCBnZXRQcmlvcml0eU1hbmFnZXIgfSA9IHByb3BzO1xyXG4gIGNvbnN0IG9wZW5UVzNEb2NQYXRoID0gKCkgPT4ge1xyXG4gICAgY29uc3QgZG9jUGF0aCA9IHBhdGguam9pbihVTklBUFAuZ2V0UGF0aCgnZG9jdW1lbnRzJyksICdUaGUgV2l0Y2hlciAzJyk7XHJcbiAgICB1dGlsLm9wbihkb2NQYXRoKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICB9O1xyXG5cclxuICBjb25zdCBpc1RXMyA9IChnYW1lSWQgPSB1bmRlZmluZWQpID0+IHtcclxuICAgIGlmIChnYW1lSWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gKGdhbWVJZCA9PT0gR0FNRV9JRCk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLmdldFN0YXRlKCk7XHJcbiAgICBjb25zdCBnYW1lTW9kZSA9IHNlbGVjdG9ycy5hY3RpdmVHYW1lSWQoc3RhdGUpO1xyXG4gICAgcmV0dXJuIChnYW1lTW9kZSA9PT0gR0FNRV9JRCk7XHJcbiAgfTtcclxuXHJcbiAgY29udGV4dC5yZWdpc3RlckFjdGlvbignZ2VuZXJpYy1sb2FkLW9yZGVyLWljb25zJywgMzAwLCAnc2F2ZScsIHt9LFxyXG4gICAgZ2V0UHJpb3JpdHlNYW5hZ2VyKCk/LnByaW9yaXR5VHlwZSA9PT0gJ3Bvc2l0aW9uLWJhc2VkJ1xyXG4gICAgICA/ICdTd2l0Y2ggdG8gUHJlZml4LWJhc2VkJ1xyXG4gICAgICA6ICdTd2l0Y2ggdG8gUG9zaXRpb24tYmFzZWQnLCAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcHJpb3JpdHlNYW5hZ2VyID0gZ2V0UHJpb3JpdHlNYW5hZ2VyKCk7XHJcbiAgICAgICAgaWYgKHByaW9yaXR5TWFuYWdlciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHByaW9yaXR5TWFuYWdlci5wcmlvcml0eVR5cGUgPSAocHJpb3JpdHlNYW5hZ2VyLnByaW9yaXR5VHlwZSA9PT0gJ3Bvc2l0aW9uLWJhc2VkJylcclxuICAgICAgICAgICAgPyAncHJlZml4LWJhc2VkJyA6ICdwb3NpdGlvbi1iYXNlZCc7XHJcbiAgICAgICAgfVxyXG4gICAgfSwgaXNUVzMpO1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVyQWN0aW9uKCdtb2QtaWNvbnMnLCAzMDAsICdvcGVuLWV4dCcsIHt9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ09wZW4gVFczIERvY3VtZW50cyBGb2xkZXInLCBvcGVuVFczRG9jUGF0aCwgaXNUVzMpO1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVyQWN0aW9uKCdnZW5lcmljLWxvYWQtb3JkZXItaWNvbnMnLCAzMDAsICdvcGVuLWV4dCcsIHt9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ09wZW4gVFczIERvY3VtZW50cyBGb2xkZXInLCBvcGVuVFczRG9jUGF0aCwgaXNUVzMpO1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVyQWN0aW9uKCdnZW5lcmljLWxvYWQtb3JkZXItaWNvbnMnLCAxMDAsICdsb290LXNvcnQnLCB7fSwgJ1Jlc2V0IFByaW9yaXRpZXMnLFxyXG4gICAgKCkgPT4ge1xyXG4gICAgICBjb250ZXh0LmFwaS5zaG93RGlhbG9nKCdpbmZvJywgJ1Jlc2V0IFByaW9yaXRpZXMnLCB7XHJcbiAgICAgICAgYmJjb2RlOiBjb250ZXh0LmFwaS50cmFuc2xhdGUoJ1RoaXMgYWN0aW9uIHdpbGwgcmV2ZXJ0IGFsbCBtYW51YWxseSBzZXQgcHJpb3JpdGllcyBhbmQgd2lsbCByZS1pbnN0YXRlIHByaW9yaXRpZXMgaW4gYW4gaW5jcmVtZW50YWwgJ1xyXG4gICAgICAgICAgKyAnbWFubmVyIHN0YXJ0aW5nIGZyb20gMS4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRvIHRoaXMgPycsIHsgbnM6IEkxOE5fTkFNRVNQQUNFIH0pLFxyXG4gICAgICB9LCBbXHJcbiAgICAgICAgeyBsYWJlbDogJ0NhbmNlbCcsIGFjdGlvbjogKCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH19LFxyXG4gICAgICAgIHsgbGFiZWw6ICdSZXNldCBQcmlvcml0aWVzJywgYWN0aW9uOiAoKSA9PiByZXNldFByaW9yaXRpZXMocHJvcHMpIH0sXHJcbiAgICAgIF0pO1xyXG4gICAgfSwgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICAgIGNvbnN0IGdhbWVNb2RlID0gc2VsZWN0b3JzLmFjdGl2ZUdhbWVJZChzdGF0ZSk7XHJcbiAgICAgIHJldHVybiBnYW1lTW9kZSA9PT0gR0FNRV9JRDtcclxuICAgIH0pO1xyXG5cclxuICBjb250ZXh0LnJlZ2lzdGVyQWN0aW9uKCdnZW5lcmljLWxvYWQtb3JkZXItaWNvbnMnLCAxMDAsICdsb290LXNvcnQnLCB7fSwgJ1NvcnQgYnkgRGVwbG95IE9yZGVyJyxcclxuICAgICgpID0+IHtcclxuICAgICAgY29udGV4dC5hcGkuc2hvd0RpYWxvZygnaW5mbycsICdTb3J0IGJ5IERlcGxveW1lbnQgT3JkZXInLCB7XHJcbiAgICAgICAgYmJjb2RlOiBjb250ZXh0LmFwaS50cmFuc2xhdGUoJ1RoaXMgYWN0aW9uIHdpbGwgc2V0IHByaW9yaXRpZXMgdXNpbmcgdGhlIGRlcGxveW1lbnQgcnVsZXMgJ1xyXG4gICAgICAgICAgKyAnZGVmaW5lZCBpbiB0aGUgbW9kcyBwYWdlLiBBcmUgeW91IHN1cmUgeW91IHdpc2ggdG8gcHJvY2VlZCA/W2JyXVsvYnJdW2JyXVsvYnJdJ1xyXG4gICAgICAgICAgKyAnUGxlYXNlIGJlIGF3YXJlIHRoYXQgYW55IGV4dGVybmFsbHkgYWRkZWQgbW9kcyAoYWRkZWQgbWFudWFsbHkgb3IgYnkgb3RoZXIgdG9vbHMpIHdpbGwgYmUgcHVzaGVkICdcclxuICAgICAgICAgICsgJ3RvIHRoZSBib3R0b20gb2YgdGhlIGxpc3QsIHdoaWxlIGFsbCBtb2RzIHRoYXQgaGF2ZSBiZWVuIGluc3RhbGxlZCB0aHJvdWdoIFZvcnRleCB3aWxsIHNoaWZ0ICdcclxuICAgICAgICAgICsgJ2luIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBkZXBsb3kgb3JkZXIhJywgeyBuczogSTE4Tl9OQU1FU1BBQ0UgfSksXHJcbiAgICAgIH0sIFtcclxuICAgICAgICB7IGxhYmVsOiAnQ2FuY2VsJywgYWN0aW9uOiAoKSA9PiB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfX0sXHJcbiAgICAgICAgeyBsYWJlbDogJ1NvcnQgYnkgRGVwbG95IE9yZGVyJywgYWN0aW9uOiAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLmdldFN0YXRlKCk7XHJcbiAgICAgICAgICBjb25zdCBnYW1lTW9kcyA9IHN0YXRlLnBlcnNpc3RlbnQubW9kc1tHQU1FX0lEXSB8fCB7fTtcclxuICAgICAgICAgIGNvbnN0IHByb2ZpbGUgPSBzZWxlY3RvcnMuYWN0aXZlUHJvZmlsZShzdGF0ZSk7XHJcbiAgICAgICAgICBjb25zdCBtb2RzID0gT2JqZWN0LmtleXMoZ2FtZU1vZHMpXHJcbiAgICAgICAgICAgIC5maWx0ZXIoa2V5ID0+IHV0aWwuZ2V0U2FmZShwcm9maWxlLCBbJ21vZFN0YXRlJywga2V5LCAnZW5hYmxlZCddLCBmYWxzZSkpXHJcbiAgICAgICAgICAgIC5tYXAoa2V5ID0+IGdhbWVNb2RzW2tleV0pO1xyXG4gICAgICAgICAgcmV0dXJuIHV0aWwuc29ydE1vZHMoR0FNRV9JRCwgbW9kcywgY29udGV4dC5hcGkpXHJcbiAgICAgICAgICAgIC50aGVuKHNvcnRlZCA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc3QgbG9hZE9yZGVyID0gdXRpbC5nZXRTYWZlKHN0YXRlLCBbJ3BlcnNpc3RlbnQnLCAnbG9hZE9yZGVyJywgcHJvZmlsZS5pZF0sIHt9KTtcclxuICAgICAgICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IE9iamVjdC5rZXlzKGxvYWRPcmRlcikuZmlsdGVyKGtleSA9PlxyXG4gICAgICAgICAgICAgICAgc29ydGVkLmZpbmQobW9kID0+IG1vZC5pZCA9PT0ga2V5KSAhPT0gdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgICBjb25zdCBtYW51YWxseUFkZGVkID0gT2JqZWN0LmtleXMobG9hZE9yZGVyKS5maWx0ZXIoa2V5ID0+ICFmaWx0ZXJlZC5pbmNsdWRlcyhrZXkpKTtcclxuICAgICAgICAgICAgICBjb25zdCBtaW5pbXVtSWR4ID0gbWFudWFsbHlBZGRlZFxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihrZXkgPT4ga2V5LmluY2x1ZGVzKExPQ0tFRF9QUkVGSVgpKVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZSgobWluLCBrZXkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgaWYgKG1pbiA8PSBsb2FkT3JkZXJba2V5XS5wb3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBtaW4gPSBsb2FkT3JkZXJba2V5XS5wb3MgKyAxO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBtaW47XHJcbiAgICAgICAgICAgICAgICB9LCAwKTtcclxuICAgICAgICAgICAgICBjb25zdCBtYW51YWxMTyA9IG1hbnVhbGx5QWRkZWQucmVkdWNlKChhY2N1bSwga2V5LCBpZHgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChrZXkuaW5jbHVkZXMoTE9DS0VEX1BSRUZJWCkpIHtcclxuICAgICAgICAgICAgICAgICAgYWNjdW1ba2V5XSA9IGxvYWRPcmRlcltrZXldO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gYWNjdW07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbWluaW11bVBvc2l0aW9uID0gKGZpbHRlcmVkLmxlbmd0aCArIG1pbmltdW1JZHggKyAxKTtcclxuICAgICAgICAgICAgICAgIGlmIChsb2FkT3JkZXJba2V5XS5wb3MgPCBtaW5pbXVtUG9zaXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgYWNjdW1ba2V5XSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5sb2FkT3JkZXJba2V5XSxcclxuICAgICAgICAgICAgICAgICAgICBwb3M6IGxvYWRPcmRlcltrZXldLnBvcyArIChtaW5pbXVtUG9zaXRpb24gKyBpZHgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHByZWZpeDogbG9hZE9yZGVyW2tleV0ucG9zICsgKG1pbmltdW1Qb3NpdGlvbiArIGlkeCArIDEpLFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gYWNjdW07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBhY2N1bVtrZXldID0gbG9hZE9yZGVyW2tleV07XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhY2N1bTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9LCB7fSk7XHJcbiAgICAgICAgICAgICAgY29uc3QgbmV3TE8gPSBmaWx0ZXJlZC5yZWR1Y2UoKGFjY3VtLCBrZXkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvRW50cnkgPSBsb2FkT3JkZXJba2V5XTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlkeCA9IHNvcnRlZC5maW5kSW5kZXgobW9kID0+IG1vZC5pZCA9PT0ga2V5KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2lnbmVkSWR4ID0gbWluaW11bUlkeCArIGlkeDtcclxuICAgICAgICAgICAgICAgIGFjY3VtW2tleV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgIC4uLmxvRW50cnksXHJcbiAgICAgICAgICAgICAgICAgIHBvczogYXNzaWduZWRJZHgsXHJcbiAgICAgICAgICAgICAgICAgIHByZWZpeDogYXNzaWduZWRJZHggKyAxLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhY2N1bTtcclxuICAgICAgICAgICAgICB9LCBtYW51YWxMTyk7XHJcblxyXG4gICAgICAgICAgICAgIGNvbnRleHQuYXBpLnN0b3JlLmRpc3BhdGNoKGFjdGlvbnMuc2V0TG9hZE9yZGVyKHByb2ZpbGUuaWQsIG5ld0xPIGFzIGFueSkpO1xyXG4gICAgICAgICAgICAgIGlmIChyZWZyZXNoRnVuYyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByZWZyZXNoRnVuYygpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhdGNoKGVyciA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc3QgYWxsb3dSZXBvcnQgPSAhKGVyciBpbnN0YW5jZW9mIHV0aWwuQ3ljbGVFcnJvcik7XHJcbiAgICAgICAgICAgICAgY29udGV4dC5hcGkuc2hvd0Vycm9yTm90aWZpY2F0aW9uKCdGYWlsZWQgdG8gc29ydCBieSBkZXBsb3ltZW50IG9yZGVyJywgZXJyLFxyXG4gICAgICAgICAgICAgICAgeyBhbGxvd1JlcG9ydCB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfX0sXHJcbiAgICAgIF0pO1xyXG4gICAgfSwgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzdGF0ZSA9IGNvbnRleHQuYXBpLnN0b3JlLmdldFN0YXRlKCk7XHJcbiAgICAgIGNvbnN0IGdhbWVNb2RlID0gc2VsZWN0b3JzLmFjdGl2ZUdhbWVJZChzdGF0ZSk7XHJcbiAgICAgIHJldHVybiBnYW1lTW9kZSA9PT0gR0FNRV9JRDtcclxuICAgIH0pO1xyXG59O1xyXG4iXX0=