import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Usuario} from "./Usuario";

@Entity()
export class Grupo extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    nombre: string
    @OneToMany(() => Usuario, (usuario) => usuario.grupo)
    usuarios: Usuario[]
}
